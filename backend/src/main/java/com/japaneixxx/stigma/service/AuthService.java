package com.japaneixxx.stigma.service;

import com.japaneixxx.stigma.domain.entity.Tattooist;
import com.japaneixxx.stigma.dto.request.LoginRequest;
import com.japaneixxx.stigma.dto.request.RegisterRequest;
import com.japaneixxx.stigma.dto.response.AuthResponse;
import com.japaneixxx.stigma.exception.BusinessException;
import com.japaneixxx.stigma.repository.TattooistRepository;
import com.japaneixxx.stigma.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final TattooistRepository tattooistRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (tattooistRepository.existsByEmail(request.email()))
            throw new BusinessException("Este email já está cadastrado.");

        if (tattooistRepository.existsBySlug(request.slug()))
            throw new BusinessException("Este slug já está em uso. Escolha outro.");

        Tattooist tattooist = Tattooist.builder()
                .name(request.name())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .whatsapp(request.whatsapp())
                .slug(request.slug().toLowerCase().trim())
                .build();

        Tattooist saved = tattooistRepository.save(tattooist);
        log.info("Tatuador registrado: id={} slug={}", saved.getId(), saved.getSlug());

        String token = jwtService.generate(saved.getId(), saved.getEmail());
        return new AuthResponse(token, saved.getId(), saved.getName(), saved.getEmail(), saved.getSlug());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Tattooist tattooist = tattooistRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException("Email ou senha incorretos."));

        if (!tattooist.getActive())
            throw new BusinessException("Conta desativada. Entre em contato com o suporte.");

        if (!passwordEncoder.matches(request.password(), tattooist.getPasswordHash()))
            throw new BusinessException("Email ou senha incorretos.");

        String token = jwtService.generate(tattooist.getId(), tattooist.getEmail());
        log.info("Login: id={}", tattooist.getId());
        return new AuthResponse(token, tattooist.getId(), tattooist.getName(), tattooist.getEmail(), tattooist.getSlug());
    }
}