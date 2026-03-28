package com.japaneixxx.stigma.domain.entity;

import com.japaneixxx.stigma.domain.enums.LeadStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "leads")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Lead {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tattooist_id", nullable = false)
    private Tattooist tattooist;

    @Column(name = "client_name", nullable = false, length = 150)
    private String clientName;

    @Column(name = "client_whatsapp", nullable = false, length = 20)
    private String clientWhatsapp;

    @Column(name = "client_email")
    private String clientEmail;

    @Column(name = "tattoo_style", nullable = false, length = 100)
    private String tattooStyle;

    @Column(name = "body_part", nullable = false, length = 100)
    private String bodyPart;

    @Column(name = "estimated_size_cm", nullable = false, precision = 5, scale = 1)
    private BigDecimal estimatedSizeCm;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reference_image_url", columnDefinition = "TEXT")
    private String referenceImageUrl;

    @Column(name = "quoted_price", precision = 10, scale = 2)
    private BigDecimal quotedPrice;

    @Column(name = "budget_notes", columnDefinition = "TEXT")
    private String budgetNotes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LeadStatus status = LeadStatus.NOVO;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}