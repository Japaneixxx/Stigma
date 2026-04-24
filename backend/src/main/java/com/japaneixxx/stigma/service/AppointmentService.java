package com.japaneixxx.stigma.service;

import com.japaneixxx.stigma.domain.entity.Appointment;
import com.japaneixxx.stigma.domain.entity.Lead;
import com.japaneixxx.stigma.domain.enums.AppointmentStatus;
import com.japaneixxx.stigma.domain.enums.LeadStatus;
import com.japaneixxx.stigma.dto.request.AppointmentRequest;
import com.japaneixxx.stigma.dto.response.AppointmentResponse;
import com.japaneixxx.stigma.exception.BusinessException;
import com.japaneixxx.stigma.exception.ResourceNotFoundException;
import com.japaneixxx.stigma.repository.AppointmentRepository;
import com.japaneixxx.stigma.repository.LeadRepository;
import com.japaneixxx.stigma.repository.TattooistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final LeadRepository leadRepository;
    private final TattooistRepository tattooistRepository;

    @Transactional
    public AppointmentResponse create(UUID tattooistId, AppointmentRequest request) {
        var tattooist = tattooistRepository.findById(tattooistId)
                .orElseThrow(() -> new ResourceNotFoundException("Tatuador não encontrado."));

        Lead lead = leadRepository.findByIdAndTattooistId(request.leadId(), tattooistId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado."));

        // Allow creating multiple appointments for the same lead.
        // Previously creation was limited to leads with status APROVADO only.
        // Relax the rule to only block scheduling for explicitly rejected leads.
        if (lead.getStatus() == LeadStatus.REJEITADO) {
            throw new BusinessException("Não é possível agendar leads com status REJEITADO.");
        }

        Appointment appointment = Appointment.builder()
                .tattooist(tattooist)
                .lead(lead)
                .scheduledAt(request.scheduledAt())
                .durationMinutes(request.durationMinutes() != null ? request.durationMinutes() : null)
                .totalPrice(request.totalPrice() != null ? request.totalPrice() : null)
                .depositAmount(request.depositAmount() != null ? request.depositAmount() : null)
                .status(AppointmentStatus.AGUARDANDO_PAGAMENTO)
                .build();

        // set lead to awaiting payment when creating the first appointment from an approved lead
        // If the lead already has a different status (e.g. CONFIRMADO), don't overwrite it when creating additional appointments.
        if (lead.getStatus() == LeadStatus.APROVADO) {
            lead.setStatus(LeadStatus.AGUARDANDO_PAGAMENTO);
            leadRepository.save(lead);
        }

        Appointment saved = appointmentRepository.save(appointment);
        log.info("Agendamento criado: id={}", saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID tattooistId, UUID appointmentId) {
        Appointment appointment = appointmentRepository.findByIdAndTattooistId(appointmentId, tattooistId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado."));
        appointmentRepository.delete(appointment);
        log.info("Agendamento excluído: id={}", appointmentId);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listByRange(UUID tattooistId, Instant start, Instant end) {
        return appointmentRepository
                .findByTattooistIdAndScheduledAtBetweenOrderByScheduledAtAsc(tattooistId, start, end)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listAll(UUID tattooistId) {
        return appointmentRepository
                .findByTattooistIdOrderByScheduledAtAsc(tattooistId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public AppointmentResponse updateStatus(UUID tattooistId, UUID appointmentId, AppointmentStatus status) {
        Appointment appointment = appointmentRepository.findByIdAndTattooistId(appointmentId, tattooistId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado."));
        appointment.setStatus(status);
        if (status == AppointmentStatus.CONFIRMADO) {
            appointment.setConfirmedAt(Instant.now());
        }
        Appointment saved = appointmentRepository.save(appointment);
        // best-effort: sync lead status to match appointment status when applicable
        try {
            Lead lead = saved.getLead();
            try {
                var mapped = LeadStatus.valueOf(status.name());
                lead.setStatus(mapped);
            } catch (IllegalArgumentException ia) {
                if (status == AppointmentStatus.AGUARDANDO_PAGAMENTO) {
                    lead.setStatus(LeadStatus.AGUARDANDO_PAGAMENTO);
                } else if (status == AppointmentStatus.CONFIRMADO) {
                    lead.setStatus(LeadStatus.CONFIRMADO);
                } else if (status == AppointmentStatus.CONCLUIDO) {
                    lead.setStatus(LeadStatus.CONCLUIDO);
                } else if (status == AppointmentStatus.CANCELADO) {
                    lead.setStatus(LeadStatus.CANCELADO);
                }
            }
            leadRepository.save(lead);
        } catch (Exception ex) {
            log.warn("Failed to sync lead status after appointment update {}: {}", appointmentId, ex.getMessage());
        }
        return toResponse(saved);
    }

    @Transactional
    public AppointmentResponse reschedule(UUID tattooistId, UUID appointmentId, Instant newDate) {
        Appointment appointment = appointmentRepository.findByIdAndTattooistId(appointmentId, tattooistId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado."));
        if (appointment.getStatus() == AppointmentStatus.CONCLUIDO
                || appointment.getStatus() == AppointmentStatus.CANCELADO) {
            throw new BusinessException("Não é possível reagendar um agendamento " + appointment.getStatus() + ".");
        }
        appointment.setScheduledAt(newDate);
        return toResponse(appointmentRepository.save(appointment));
    }

    private AppointmentResponse toResponse(Appointment a) {
        return new AppointmentResponse(
                a.getId(),
                a.getLead().getId(),
                a.getLead().getClientName(),
                a.getLead().getClientWhatsapp(),
                a.getLead().getTattooStyle(),
                a.getLead().getBodyPart(),
                a.getScheduledAt(),
                a.getDurationMinutes(),
                a.getTotalPrice(),
                a.getDepositAmount(),
                a.getStatus(),
                a.getPaymentStatus(),
                a.getCreatedAt()
        );
    }
}
