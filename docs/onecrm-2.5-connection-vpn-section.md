# Connection and VPN Section Plan

## Purpose

The `接続方式と VPN / 连接方式与 VPN` section must stop using mock numbers and hard-coded names. It should summarize the currently displayed customer environment data and provide practical shortcuts for VPN guide files.

## Functional Scope

- Count the environments currently visible on the page.
- Split visible environments into:
  - direct access: no VPN requirement and no dedicated-line tag.
  - VPN access: `vpn_required=true`, a selected VPN guide, or a VPN-like tag.
  - dedicated-line access: tags such as `専用線`, `专线`, `leased line`, `private line`.
- Show the total visible environment count in the donut center.
- Show the three computed access categories beside the donut.
- List actual VPN guides from visible organizations.
- For each VPN guide, show:
  - organization code and name.
  - VPN guide name.
  - how many visible environments currently use that guide.
  - whether request/application is required based on guide tags such as `申请必要`.
- List actual source files attached to visible VPN guides.
- Source-file download buttons must download the archived MinIO object through the backend, not point to placeholder files.
- If no VPN guides or no source files exist, show a real empty state instead of fake rows.

## Data Rules

- This section uses the same filtered organization set as the visible customer environment page.
- VPN usage is counted by `environment.vpn_required`, `environment.vpn_guide_id`, `environment.vpnGuide`, and VPN-like tags.
- Dedicated-line usage is identified by tags, because no dedicated-line schema exists yet.
- Direct usage is the remaining visible environments after VPN and dedicated-line classification.
- Source files come from `vpnGuide.sourceFiles`.

## Backend Requirement

- Add `GET /api/files/{file_id}/download`.
- The endpoint resolves `file_objects` by id, reads the object from MinIO, and returns it with the original filename.
- If the file does not exist in DB or MinIO, return `404`.

## Test Expectations

- The summary function must count direct, VPN, and dedicated-line environments deterministically.
- The summary function must count VPN guide usage by guide id.
- The source file list must preserve guide and organization context.
- Frontend build and Python compilation must pass.
