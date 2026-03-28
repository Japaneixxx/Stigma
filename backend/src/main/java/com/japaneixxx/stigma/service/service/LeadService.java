package com.japaneixxx.stigma.service.service;

import com.japaneixxx.stigma.domain.entity.Lead;
import com.japaneixxx.stigma.domain.entity.Tattooist;
import com.japaneixxx.stigma.domain.enums.LeadStatus;
import com.japaneixxx.stigma.dto.request.LeadRequest;
import com.japaneixxx.stigma.dto.response.LeadResponse;
import com.japaneixxx.stigma.exception.BusinessException;
import com.japaneixxx.stigma.exception.ResourceNotFoundException;
import com.japaneixxx.stigma.mapper.LeadMapper;
import com.japaneixxx.stigma.repository.LeadRepository;
import com.japaneixxx.stigma.repository.TattooistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

// LeadService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final LeadRepository leadRepository;
    private final TattooistRepository tattooistRepository;
    private final LeadMapper leadMapper;

    @Transactional
    public LeadResponse createLead(String tattooistSlug, LeadRequest request) {
        // 1. Valida se o tatuador existe e está ativo
        Tattooist tattooist = tattooistRepository.findBySlugAndActiveTrue(tattooistSlug)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tatuador não encontrado: " + tattooistSlug
                ));

        // 2. Evita spam: bloqueia duplicata ativa do mesmo WhatsApp
        boolean hasActiveLead = leadRepository.existsByClientWhatsappAndTattooistIdAndStatusIn(
                request.clientWhatsapp(),
                tattooist.getId(),
                List.of(LeadStatus.NOVO, LeadStatus.APROVADO, LeadStatus.AGUARDANDO_PAGAMENTO)
        );

        if (hasActiveLead) {
            throw new BusinessException(
                    "Já existe uma solicitação ativa para este WhatsApp. " +
                            "Aguarde o retorno do tatuador."
            );
        }

        // 3. Monta e persiste a entidade
        Lead lead = leadMapper.toEntity(request);
        lead.setTattooist(tattooist);
        lead.setStatus(LeadStatus.NOVO);

        Lead savedLead = leadRepository.save(lead);

        log.info("Novo lead criado: id={}, tatuador={}, cliente={}",
                savedLead.getId(), tattooistSlug, request.clientName());

        // 4. (Futuro) Disparar notificação WhatsApp para o tatuador
        // whatsappService.notifyNewLead(tattooist, savedLead);

        return leadMapper.toResponse(savedLead);
    }

    @Transactional(readOnly = true)
    public Page<LeadResponse> getLeads(UUID tattooistId, LeadStatus status, Pageable pageable) {
        Page<Lead> page = (status != null)
                ? leadRepository.findByTattooistIdAndStatusOrderByCreatedAtDesc(tattooistId, status, pageable)
                : leadRepository.findByTattooistIdOrderByCreatedAtDesc(tattooistId, pageable);

        return page.map(leadMapper::toResponse);
    }

    @Transactional
    public LeadResponse approveLead(UUID tattooistId, UUID leadId, BigDecimal quotedPrice) {
        Lead lead = findLeadByTattooistAndId(tattooistId, leadId);

        if (lead.getStatus() != LeadStatus.NOVO) {
            throw new BusinessException("Apenas leads com status NOVO podem ser aprovados.");
        }

        lead.setStatus(LeadStatus.APROVADO);
        lead.setQuotedPrice(quotedPrice);

        log.info("Lead aprovado: id={}", leadId);

        // (Futuro) Gerar token único e enviar link de agendamento via WhatsApp
        // bookingTokenService.generateAndSend(lead);

        return leadMapper.toResponse(leadRepository.save(lead));
    }

    @Transactional
    public LeadResponse rejectLead(UUID tattooistId, UUID leadId, String reason) {
        Lead lead = findLeadByTattooistAndId(tattooistId, leadId);

        if (lead.getStatus() != LeadStatus.NOVO) {
            throw new BusinessException("Apenas leads com status NOVO podem ser rejeitados.");
        }

        lead.setStatus(LeadStatus.REJEITADO);

        log.info("Lead rejeitado: id={}, motivo={}", leadId, reason);

        return leadMapper.toResponse(leadRepository.save(lead));
    }

    private Lead findLeadByTattooistAndId(UUID tattooistId, UUID leadId) {
        return leadRepository.findById(leadId)
                .filter(l -> l.getTattooist().getId().equals(tattooistId))
                .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado: " + leadId));
    }
}