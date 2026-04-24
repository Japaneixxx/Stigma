package com.japaneixxx.stigma.dto.request;

import com.japaneixxx.stigma.domain.enums.LeadStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record UpdateLeadRequest(
        @Positive
        BigDecimal quotedPrice,
        @Positive
        BigDecimal depositAmount,
        String tattooistNotes,
        LeadStatus status,
        @DecimalMin("1.0")
        @DecimalMax("100.0")
        BigDecimal estimatedSizeCm,
        String tattooStyle,
        String bodyPart,
        String description
        ) {

}
