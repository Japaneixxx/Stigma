package com.japaneixxx.stigma.service;

import com.japaneixxx.stigma.domain.entity.Lead;
import com.japaneixxx.stigma.domain.enums.LeadStatus;
import com.japaneixxx.stigma.dto.request.ApproveLeadRequest;
import com.japaneixxx.stigma.dto.request.LeadRequest;
import com.japaneixxx.stigma.dto.response.LeadResponse;
import com.japaneixxx.stigma.exception.BusinessException;
import com.japaneixxx.stigma.exception.ResourceNotFoundException;
import com.japaneixxx.stigma.mapper.LeadMapper;
import com.japaneixxx.stigma.repository.LeadRepository;
import com.japaneixxx.stigma.repository.TattooistRepository;
import com.japaneixxx.stigma.repository.AppointmentRepository;
import com.japaneixxx.stigma.domain.enums.AppointmentStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final LeadRepository leadRepository;
    private final TattooistRepository tattooistRepository;
    private final LeadMapper leadMapper;
    private final AppointmentRepository appointmentRepository;

    @Transactional
    public LeadResponse create(String slug, LeadRequest request) {
        var tattooist = tattooistRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tatuador não encontrado: " + slug));

        Lead lead = leadMapper.toEntity(request);
        lead.setTattooist(tattooist);
        Lead saved = leadRepository.save(lead);
        log.info("Lead criado: id={} tatuador={}", saved.getId(), slug);
        return leadMapper.toResponse(saved);
    }

    @Transactional
    public LeadResponse createForTattooist(UUID tattooistId, LeadRequest request) {
        var tattooist = tattooistRepository.findById(tattooistId)
                .orElseThrow(() -> new ResourceNotFoundException("Tatuador não encontrado: " + tattooistId));

        Lead lead = leadMapper.toEntity(request);
        lead.setTattooist(tattooist);
        Lead saved = leadRepository.save(lead);
        log.info("Lead criado via dashboard: id={} tatuador={}", saved.getId(), tattooist.getId());
        return leadMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<LeadResponse> list(UUID tattooistId, LeadStatus status, Pageable pageable) {
        var page = status != null
                ? leadRepository.findByTattooistIdAndStatusOrderByCreatedAtDesc(tattooistId, status, pageable)
                : leadRepository.findByTattooistIdOrderByCreatedAtDesc(tattooistId, pageable);
        return page.map(leadMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public LeadResponse get(UUID tattooistId, UUID leadId) {
        Lead lead = findOrThrow(tattooistId, leadId);
        return leadMapper.toResponse(lead);
    }

    @Transactional
    public LeadResponse approve(UUID tattooistId, UUID leadId, ApproveLeadRequest request) {
        Lead lead = findOrThrow(tattooistId, leadId);
        assertStatus(lead, LeadStatus.NOVO, "aprovar");
        lead.setStatus(LeadStatus.APROVADO);
        lead.setQuotedPrice(request.quotedPrice());
        if (request.depositAmount() != null) {
            lead.setDepositAmount(request.depositAmount());
        }
        lead.setTattooistNotes(request.tattooistNotes());
        log.info("Lead aprovado: id={}", leadId);
        Lead saved = leadRepository.save(lead);
        // best-effort: sync related appointments' statuses
        try {
            var appts = appointmentRepository.findByLeadIdAndTattooistId(leadId, tattooistId);
            for (var a : appts) {
                a.setStatus(AppointmentStatus.AGUARDANDO_PAGAMENTO);
                appointmentRepository.save(a);
            }
        } catch (Exception ex) {
            log.warn("Failed to sync appointments after approving lead {}: {}", leadId, ex.getMessage());
        }
        return leadMapper.toResponse(saved);
    }

    @Transactional
    public LeadResponse reject(UUID tattooistId, UUID leadId) {
        Lead lead = findOrThrow(tattooistId, leadId);
        assertStatus(lead, LeadStatus.NOVO, "rejeitar");
        lead.setStatus(LeadStatus.REJEITADO);
        log.info("Lead rejeitado: id={}", leadId);
        return leadMapper.toResponse(leadRepository.save(lead));
    }

    @Transactional
    public LeadResponse update(UUID tattooistId, UUID leadId, com.japaneixxx.stigma.dto.request.UpdateLeadRequest request) {
        Lead lead = findOrThrow(tattooistId, leadId);

        // allow updating quotedPrice and budgetNotes regardless of current status
        if (request.quotedPrice() != null) {
            lead.setQuotedPrice(request.quotedPrice());
        }
        if (request.depositAmount() != null) {
            lead.setDepositAmount(request.depositAmount());
        }
        if (request.tattooistNotes() != null) {
            lead.setTattooistNotes(request.tattooistNotes());
        }

        // allow updating basic tattoo info
        if (request.estimatedSizeCm() != null) {
            lead.setEstimatedSizeCm(request.estimatedSizeCm());
        }
        if (request.tattooStyle() != null) {
            lead.setTattooStyle(request.tattooStyle());
        }
        if (request.bodyPart() != null) {
            lead.setBodyPart(request.bodyPart());
        }
        if (request.description() != null) {
            lead.setDescription(request.description());
        }

        // if status change requested, apply it (no guard) — user requested free transitions
        if (request.status() != null) {
            if (request.status() != lead.getStatus()) {
                lead.setStatus(request.status());
                // best-effort: sync appointment statuses to match lead status when possible
                try {
                    var appts = appointmentRepository.findByLeadIdAndTattooistId(leadId, tattooistId);
                    for (var a : appts) {
                        try {
                            var mapped = AppointmentStatus.valueOf(request.status().name());
                            a.setStatus(mapped);
                        } catch (IllegalArgumentException ia) {
                            // fallback common mappings
                            if (request.status() == LeadStatus.AGUARDANDO_PAGAMENTO) {
                                a.setStatus(AppointmentStatus.AGUARDANDO_PAGAMENTO); 
                            }else if (request.status() == LeadStatus.CONFIRMADO) {
                                a.setStatus(AppointmentStatus.CONFIRMADO); 
                            }else if (request.status() == LeadStatus.CONCLUIDO) {
                                a.setStatus(AppointmentStatus.CONCLUIDO); 
                            }else if (request.status() == LeadStatus.CANCELADO) {
                                a.setStatus(AppointmentStatus.CANCELADO);
                            }
                        }
                        appointmentRepository.save(a);
                    }
                } catch (Exception ex) {
                    log.warn("Failed to sync appointments after lead update {}: {}", leadId, ex.getMessage());
                }
            }
        }

        log.info("Lead atualizado: id={}", leadId);
        return leadMapper.toResponse(leadRepository.save(lead));
    }

    private Lead findOrThrow(UUID tattooistId, UUID leadId) {
        return leadRepository.findByIdAndTattooistId(leadId, tattooistId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado: " + leadId));
    }

    private void assertStatus(Lead lead, LeadStatus expected, String action) {
        if (lead.getStatus() != expected) {
            throw new BusinessException("Só é possível " + action + " leads com status " + expected + ".");
        }
    }
}
