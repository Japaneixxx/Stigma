package com.japaneixxx.stigma.dto.response;

import com.japaneixxx.stigma.domain.enums.LeadStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LeadResponse(
        UUID id,
        String clientName,
        String clientWhatsapp,
        String clientEmail,
        String tattooStyle,
        String bodyPart,
        BigDecimal estimatedSizeCm,
        String description,
        String referenceImageUrl,
        BigDecimal quotedPrice,
        BigDecimal depositAmount,
        String tattooistNotes,
        LeadStatus status,
        Instant createdAt,
        Instant updatedAt
        ) {

}
