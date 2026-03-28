package com.japaneixxx.stigma.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tattooists")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tattooist {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(length = 20)
    private String whatsapp;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(length = 100)
    private String instagram;

    @Column(name = "pix_key")
    private String pixKey;

    @Column(name = "deposit_percentage", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal depositPercentage = new BigDecimal("30.00");

    @Column(name = "google_calendar_id")
    private String googleCalendarId;

    @Column(name = "google_refresh_token", columnDefinition = "TEXT")
    private String googleRefreshToken;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}