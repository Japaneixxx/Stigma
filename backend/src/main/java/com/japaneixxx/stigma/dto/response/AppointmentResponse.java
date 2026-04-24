package com.japaneixxx.stigma.dto.response;

import com.japaneixxx.stigma.domain.enums.AppointmentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AppointmentResponse(
        UUID id,
        UUID leadId,
        String clientName,
        String clientWhatsapp,
        String tattooStyle,
        String bodyPart,
        Instant scheduledAt,
        Integer durationMinutes,
        BigDecimal totalPrice,
        BigDecimal depositAmount,
        AppointmentStatus status,
        String paymentStatus,
        Instant createdAt
) {}