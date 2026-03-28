package com.japaneixxx.stigma.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record ApproveLeadRequest(
        @NotNull @Positive BigDecimal quotedPrice,
        String budgetNotes
) {}