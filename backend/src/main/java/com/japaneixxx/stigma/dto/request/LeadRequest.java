package com.japaneixxx.stigma.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record LeadRequest(
        @NotBlank(message = "Nome é obrigatório") @Size(max = 150)
        String clientName,

        @NotBlank(message = "WhatsApp é obrigatório")
        @Pattern(regexp = "^\\+?[1-9]\\d{10,14}$", message = "WhatsApp inválido")
        String clientWhatsapp,

        String clientEmail,

        @NotBlank(message = "Estilo é obrigatório")
        String tattooStyle,

        @NotBlank(message = "Local do corpo é obrigatório")
        String bodyPart,

        @NotNull(message = "Tamanho é obrigatório")
        @DecimalMin("1.0") @DecimalMax("100.0")
        BigDecimal estimatedSizeCm,

        @Size(max = 1000)
        String description,

        String referenceImageUrl
) {}
