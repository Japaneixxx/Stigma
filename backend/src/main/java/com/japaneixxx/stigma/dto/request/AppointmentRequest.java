package com.japaneixxx.stigma.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AppointmentRequest(
        @NotNull
        UUID leadId,
        @NotNull
        Instant scheduledAt,
        Integer durationMinutes,
        // optional: totalPrice may be provided later
        BigDecimal totalPrice,
        // optional: depositAmount may be provided later
        BigDecimal depositAmount
        ) {

}
