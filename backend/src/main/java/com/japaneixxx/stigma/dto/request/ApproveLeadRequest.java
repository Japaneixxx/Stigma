package com.japaneixxx.stigma.dto.request;

import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record ApproveLeadRequest(
        @Positive
        BigDecimal quotedPrice,
        String tattooistNotes,
        @Positive
        BigDecimal depositAmount
        ) {

}
