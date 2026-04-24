package com.japaneixxx.stigma.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 150)
        String name,

        @NotBlank(message = "Email é obrigatório")
        @Email(message = "Email inválido")
        String email,

        @NotBlank(message = "Senha é obrigatória")
        @Size(min = 8, message = "Senha deve ter pelo menos 8 caracteres")
        String password,

        @NotBlank(message = "WhatsApp é obrigatório")
        String whatsapp,

        @NotBlank(message = "Slug é obrigatório")
        @Size(min = 3, max = 100)
        String slug
) {}