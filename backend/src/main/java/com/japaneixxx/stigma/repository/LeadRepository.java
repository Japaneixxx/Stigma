package com.japaneixxx.stigma.repository;

import com.japaneixxx.stigma.domain.entity.Lead;
import com.japaneixxx.stigma.domain.enums.LeadStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID> {
    Page<Lead> findByTattooistIdOrderByCreatedAtDesc(UUID tattooistId, Pageable pageable);
    Page<Lead> findByTattooistIdAndStatusOrderByCreatedAtDesc(UUID tattooistId, LeadStatus status, Pageable pageable);
    boolean existsByClientWhatsappAndTattooistIdAndStatusIn(String whatsapp, UUID tattooistId, List<LeadStatus> statuses);
    Optional<Lead> findByIdAndTattooistId(UUID id, UUID tattooistId);
}
