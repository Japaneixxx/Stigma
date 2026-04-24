package com.japaneixxx.stigma.repository;

import com.japaneixxx.stigma.domain.entity.Appointment;
import com.japaneixxx.stigma.domain.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findByTattooistIdAndScheduledAtBetweenOrderByScheduledAtAsc(
            UUID tattooistId, Instant start, Instant end);

    List<Appointment> findByTattooistIdOrderByScheduledAtAsc(UUID tattooistId);

    Optional<Appointment> findByIdAndTattooistId(UUID id, UUID tattooistId);

    List<Appointment> findByLeadIdAndTattooistId(UUID leadId, UUID tattooistId);

    @Query("SELECT a FROM Appointment a WHERE a.tattooist.id = :tattooistId AND a.status = :status ORDER BY a.scheduledAt ASC")
    List<Appointment> findByTattooistIdAndStatus(@Param("tattooistId") UUID tattooistId,
            @Param("status") AppointmentStatus status);
}
