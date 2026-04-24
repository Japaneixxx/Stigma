package com.japaneixxx.stigma.dto.response;

import java.util.UUID;

public record AuthResponse(
        String token,
        UUID tattooistId,
        String name,
        String email,
        String slug
) {}