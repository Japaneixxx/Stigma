package com.japaneixxx.stigma.controller.controller;

import com.japaneixxx.stigma.domain.enums.LeadStatus;
import com.japaneixxx.stigma.dto.request.LeadRequest;
import com.japaneixxx.stigma.dto.response.LeadResponse;
import com.japaneixxx.stigma.service.service.LeadService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.awt.print.Pageable;
import java.math.BigDecimal;
import java.util.UUID;

// LeadController.java
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
public class LeadController {

    private final LeadService leadService;

    // --- Endpoint público: Landing Page ---
    @PostMapping("/tattooists/{slug}/leads")
    @ResponseStatus(HttpStatus.CREATED)
    public LeadResponse createLead(
            @PathVariable String slug,
            @Valid @RequestBody LeadRequest request
    ) {
        return leadService.createLead(slug, request);
    }

    // --- Endpoints autenticados: Dashboard ---
    @GetMapping("/dashboard/leads")
    public Page<LeadResponse> getLeads(
            @AuthenticationPrincipal TattooistPrincipal principal,
            @RequestParam(required = false) LeadStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return leadService.getLeads(principal.getTattooistId(), status, pageable);
    }

    @PatchMapping("/dashboard/leads/{leadId}/approve")
    public LeadResponse approveLead(
            @AuthenticationPrincipal TattooistPrincipal principal,
            @PathVariable UUID leadId,
            @RequestParam @NotNull BigDecimal quotedPrice
    ) {
        return leadService.approveLead(principal.getTattooistId(), leadId, quotedPrice);
    }

    @PatchMapping("/dashboard/leads/{leadId}/reject")
    public LeadResponse rejectLead(
            @AuthenticationPrincipal TattooistPrincipal principal,
            @PathVariable UUID leadId,
            @RequestParam(required = false) String reason
    ) {
        return leadService.rejectLead(principal.getTattooistId(), leadId, reason);
    }
}