package com.japaneixxx.stigma.domain.entity;

import com.japaneixxx.stigma.domain.enums.AppointmentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appointments")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tattooist_id", nullable = false)
    private Tattooist tattooist;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_minutes", nullable = true)
    private Integer durationMinutes;

    @Column(name = "total_price", nullable = true, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "deposit_amount", nullable = true, precision = 10, scale = 2)
    private BigDecimal depositAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "appointment_status")
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.AGUARDANDO_PAGAMENTO;

    @Column(name = "booking_token")
    private String bookingToken;

    @Column(name = "booking_token_expires_at")
    private Instant bookingTokenExpiresAt;

    @Column(name = "google_event_id")
    private String googleEventId;

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "payment_status")
    private String paymentStatus;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
