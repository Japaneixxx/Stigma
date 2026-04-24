package com.japaneixxx.stigma.controller;

import com.japaneixxx.stigma.domain.enums.LeadStatus;
import com.japaneixxx.stigma.dto.request.ApproveLeadRequest;
import com.japaneixxx.stigma.dto.request.LeadRequest;
import com.japaneixxx.stigma.dto.request.UpdateLeadRequest;
import com.japaneixxx.stigma.dto.response.LeadResponse;
import com.japaneixxx.stigma.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class LeadController {

    private final LeadService leadService;

    // Público — vindo da landing page
    @PostMapping("/tattooists/{slug}/leads")
    @ResponseStatus(HttpStatus.CREATED)
    public LeadResponse create(@PathVariable String slug,
            @Valid @RequestBody LeadRequest request) {
        return leadService.create(slug, request);
    }

    // Dashboard — autenticado
    @GetMapping("/dashboard/leads")
    public Page<LeadResponse> list(
            @AuthenticationPrincipal String tattooistId,
            @RequestParam(required = false) LeadStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return leadService.list(UUID.fromString(tattooistId), status, pageable);
    }

    @PatchMapping("/dashboard/leads/{leadId}/approve")
    public LeadResponse approve(@AuthenticationPrincipal String tattooistId,
            @PathVariable UUID leadId,
            @Valid @RequestBody ApproveLeadRequest request) {
        return leadService.approve(UUID.fromString(tattooistId), leadId, request);
    }

    @PatchMapping("/dashboard/leads/{leadId}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@AuthenticationPrincipal String tattooistId,
            @PathVariable UUID leadId) {
        leadService.reject(UUID.fromString(tattooistId), leadId);
    }

    @PatchMapping("/dashboard/leads/{leadId}")
    public LeadResponse update(@AuthenticationPrincipal String tattooistId,
            @PathVariable UUID leadId,
            @Valid @RequestBody UpdateLeadRequest request) {
        return leadService.update(UUID.fromString(tattooistId), leadId, request);
    }

    @GetMapping("/dashboard/leads/{leadId}")
    public LeadResponse get(@AuthenticationPrincipal String tattooistId,
            @PathVariable UUID leadId) {
        return leadService.get(UUID.fromString(tattooistId), leadId);
    }

    // Dashboard — allow tattooist to manually create a lead (e.g. scheduled outside the site)
    @PostMapping("/dashboard/leads")
    @ResponseStatus(HttpStatus.CREATED)
    public LeadResponse createFromDashboard(@AuthenticationPrincipal String tattooistId,
            @Valid @RequestBody LeadRequest request) {
        return leadService.createForTattooist(UUID.fromString(tattooistId), request);
    }
}
