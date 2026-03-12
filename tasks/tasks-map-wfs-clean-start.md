## Relevant Files

- `tasks/tasks-map-wfs-clean-start.md` - Checklist persiapan worktree bersih sebelum task WFS resmi dimulai.
- `tasks/tasks-map-wfs-refactor.md` - Task implementasi WFS yang baru boleh dijalankan setelah prep selesai.
- `.gitignore` - Perlu diupdate jika memilih direktori worktree project-local seperti `.worktrees/`.
- `client/src/lib/region-config.ts` - Salah satu perubahan lokal yang perlu dipreservasi dengan rapi sebelum branch WFS dibuat.
- `client/src/lib/map/map-data-source.ts` - Seam pre-WFS yang sudah ada di dirty workspace dan perlu diputuskan nasibnya.
- `client/src/pages/map-page.tsx` - File utama yang sekarang memuat perubahan lokal campuran dan harus diaudit sebelum dipindah ke branch baru.
- `docs/changelog.md` - Tempat mencatat batch prep jika perubahan task/docs ini ingin diarsipkan sebagai bagian dari workflow.
- `docs/plans/2026-03-12-map-wfs-refactor-plan.md` - Baseline keputusan arsitektur yang akan dipakai setelah clean start siap.

### Notes

- Task ini sengaja terpisah dari `tasks-map-wfs-refactor.md` agar cleanup git/worktree tidak tercampur dengan implementasi WFS.
- Jangan mulai task WFS sebelum task prep ini selesai dan worktree baru tervalidasi bersih.
- Karena current branch adalah `codex/mobile-backoffice-refactor` dan worktree utama sedang dirty, prioritas pertama adalah preservasi perubahan lokal, bukan coding fitur baru.
- Jika memilih worktree project-local (`.worktrees/` atau `worktrees/`), pastikan direktori itu di-ignore dulu sebelum worktree dibuat.

## Instructions for Completing Tasks

**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang task branch/worktree sebelum command git dijalankan dan hasilnya dibaca.

## Tasks

- [x] 0.0 Create cleanup branch plan
  - [x] 0.1 Catat branch aktif saat ini (`codex/mobile-backoffice-refactor`) dan status worktree dirty sebagai baseline.
  - [x] 0.2 Kelompokkan perubahan lokal saat ini menjadi batch logis:
    - docs/planning
    - region config baseline
    - map data mode pre-WFS seam
    - perubahan lain yang ternyata tidak relevan ke WFS
  - [x] 0.3 Putuskan strategi preservasi perubahan lokal sebelum membuat branch WFS:
    - dirty workspace utama dibiarkan utuh sebagai source-of-truth sementara
    - branch WFS dibuat di worktree terpisah dari `codex/staging`
    - replay dilakukan selektif hanya untuk prerequisite yang disetujui
  - [x] 0.4 Dokumentasikan keputusan preservasi itu singkat di task log atau handoff note sebelum lanjut.

- [x] 1.0 Prepare isolated clean worktree
  - [x] 1.1 Tentukan lokasi worktree:
    - `.worktrees/` dipilih sebagai lokasi project-local
    - `worktrees/` jika repo memang memakai itu
    - lokasi global jika tidak ingin menambah noise di root project
  - [x] 1.2 Jika memilih direktori project-local, verifikasi direktori tersebut di-ignore oleh git.
  - [x] 1.3 Jika direktori project-local belum di-ignore, tambahkan rule ignore lebih dulu dan verifikasi ulang.
  - [x] 1.4 Checkout branch dasar `codex/staging` tanpa membawa dirty changes dari workspace utama.
  - [x] 1.5 Buat worktree branch baru `codex/map-wfs-refactor` dari `codex/staging`.
  - [x] 1.6 Pastikan worktree baru benar-benar bersih (`git status --short` kosong).

- [x] 2.0 Rehydrate only the approved prerequisite changes
  - [x] 2.1 Putuskan apakah `region config baseline` perlu dibawa ke branch WFS sekarang atau mendarat lebih dulu di branch lain.
  - [x] 2.2 Putuskan apakah `map data mode` seam perlu dibawa sebagai commit prep sebelum adapter WFS, atau diulang bersih di worktree baru.
  - [x] 2.3 Replay hanya perubahan yang memang jadi prerequisite WFS:
    - config/env map source
    - helper map data source
    - wiring minimal yang masih relevan
  - [x] 2.4 Hindari membawa batch docs atau UI lain yang tidak perlu ke branch WFS.
  - [x] 2.5 Jalankan verifikasi setelah replay prerequisite:
    - `npm run check`
    - `npm run build`
    - test targeted yang relevan bila helper ikut dibawa

- [x] 3.0 Re-baseline the new worktree
  - [x] 3.1 Catat hasil command baseline pada worktree baru:
    - branch aktif
    - worktree path
    - status git
  - [x] 3.2 Verifikasi dependency project siap dipakai di worktree baru.
  - [x] 3.3 Pastikan tidak ada failure existing yang akan mengaburkan pekerjaan WFS.
  - [x] 3.4 Tulis checkpoint singkat bahwa clean start siap dan task WFS boleh dimulai.

- [x] 4.0 Hand off into the WFS implementation task
  - [x] 4.1 Masuk ke `tasks/tasks-map-wfs-refactor.md` dan mulai lagi dari task `0.0` atau tandai bahwa prasyarat branch/worktree sudah dipenuhi oleh task prep ini.
  - [x] 4.2 Kunci keputusan apakah task WFS akan memakai:
    - `direct-wfs`
    - `backend-proxy`
    - `hybrid adapter` dengan mode bertahap
  - [x] 4.3 Jalankan batch pertama task WFS hanya setelah step branch/worktree dan prerequisite replay benar-benar selesai.
