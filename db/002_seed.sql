-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data — GENERATED FILE, do not hand-edit.
-- Regenerate with:  node db/generate-seed.mjs
--
-- Source: the FALLBACK_GALLERIES array in gallery.html.
-- Idempotent: keyed on gallery slug, safe to re-run. Re-running resets each
-- seeded gallery's media list back to what gallery.html says, so don't re-run
-- after you have curated these galleries in the admin panel.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── categories ────────────────────────────────────────────────────────────
insert into public.categories (name, sort_order) values ('Baseball', 0)
  on conflict (name) do update set sort_order = excluded.sort_order;
insert into public.categories (name, sort_order) values ('Raider Challenge', 1)
  on conflict (name) do update set sort_order = excluded.sort_order;
insert into public.categories (name, sort_order) values ('AFJROTC', 2)
  on conflict (name) do update set sort_order = excluded.sort_order;
insert into public.categories (name, sort_order) values ('Tennis', 3)
  on conflict (name) do update set sort_order = excluded.sort_order;
insert into public.categories (name, sort_order) values ('Extras', 4)
  on conflict (name) do update set sort_order = excluded.sort_order;

-- ── Baseball 2026 Game 1 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Baseball 2026 Game 1', 'baseball-2026-game-1', '2026 baseball', 'https://drive.google.com/thumbnail?id=1xWT9-DpGniKjnfl1lPA8A4-aiNvJDejL&sz=w1000', 'public', 0)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'baseball-2026-game-1' and c.name = 'Baseball'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'baseball-2026-game-1');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1kiVKuzyQj1gsILlhczQrgCpi43m5c1Ko', null, 0),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1KPXd-1DjO60bNsRTRWSAW82BMWXssPYp', null, 1),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1hkGzn2qzXtxJghopmZrZAKnG14GzaVAI', null, 2),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1489k7FHQvD8hPhHC3GKL-ExB0FALylSK', null, 3),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1nYZguXJYgY9DSSRB12jKJcjMHb7rp7_Y', null, 4),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1i5I_ORnI_jkYLbAVfKBLAGnSSkGxNtU7', null, 5),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1iw_jJO1nWLtqt-vVvKhKr6S6sqoFaQHf', null, 6),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1LQopYB6xlmVwSzSQYDwlLi_0SyvvOg4f', null, 7),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1FZDWjZcWm99oYVJHcbWXk3vkdEwyVqMJ', null, 8),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1PBZVm2TjLzbVk0wKHLLD_gkF_-NeVYHl', null, 9),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1sbevmThmkHwtGM8alnE_dbgh4i3zWYyD', null, 10),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '10h3strQr2KxznOlf52rnlaWNWowIMVPu', null, 11),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1bIczFeEKAaibS33pj2ZVyYI5QYbRjMoG', null, 12),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1i24hZo_PJwSZsszJvz7f1ECmlQ1n8o0-', null, 13),
  ((select id from public.galleries where slug = 'baseball-2026-game-1'), 'photo', '1BIOznkJbyBZg7pHsnn6Aog3KYSrgvKWI', null, 14);

-- ── Baseball 2026 Game 2 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Baseball 2026 Game 2', 'baseball-2026-game-2', '2026 baseball', 'https://drive.google.com/thumbnail?id=1HJsopvmRg0BxzFi7bi8p98xvH3RJNb56&sz=w1000', 'public', 1)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'baseball-2026-game-2' and c.name = 'Baseball'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'baseball-2026-game-2');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1NEEivJvpBti17rBFDVyOUiVtYw1tGiuC', null, 0),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1BTZES8vL8nY_WWAAHUh1hq6yzWosY_bc', null, 1),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1Al39Kxt9z3SUWJ9s9U3RZ5dMFvgqWjGe', null, 2),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1lFyYBEtpKO8G8-Z9vhWNkJrXWyf1m-Vd', null, 3),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '17QDeaS-RlRApNge0KwA-d6pordQVe7AG', null, 4),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1U8VFoWtbiU0GySnT6rXAjmFEd_90K2hz', null, 5),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1FQCGUBMspuGvcFG7E3RdhBWi9s9ELG2p', null, 6),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '14Ay0xN3B0Cbsri7YnmY49DyE5o6EfUva', null, 7),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1CIyXoaOrh_rhJ8rlPo_Q9jQ1ek_3gWiW', null, 8),
  ((select id from public.galleries where slug = 'baseball-2026-game-2'), 'photo', '1mC-Oj76AlovN5b4X-l9IEfGulIHdRRHC', null, 9);

-- ── Baseball 2026 Game 3 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Baseball 2026 Game 3', 'baseball-2026-game-3', '2026 baseball', 'https://drive.google.com/thumbnail?id=1yEakSyd8vNLlG-VUQl2YKqX6hjKEa3Au&sz=w1000', 'public', 2)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'baseball-2026-game-3' and c.name = 'Baseball'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'baseball-2026-game-3');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '18C3CE6xjdacpVe7-C_vIOIxPIKjm59I9', null, 0),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1c_b89goUYcVESA1ewQIa8u-AuJ-V2hw4', null, 1),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1fQiJvqy5Yn-JAT3fcX-AEccCiOYvYSIi', null, 2),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '121u_nZcO6Ph_x2z3ftFB9LEqwNWIcSVB', null, 3),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1nID7TlbBSwor-FHVoFtmt2UKAD8HJkyu', null, 4),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1_pGudBeRetM1cnfR2hFsZm7cqrf_MZIZ', null, 5),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1oo9dl-dp9VtMd3MhMP-yGRuPguR4Tv0u', null, 6),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1IJY4dZDoUNdgmhiMUMZPu7tli4CJiIAH', null, 7),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '16jAI633ItECtvzED_du3akORsIh-q7Pa', null, 8),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1qvTp_F5NPM8AVj-PsPHftD5ULzlD60WE', null, 9),
  ((select id from public.galleries where slug = 'baseball-2026-game-3'), 'photo', '1gYbRkZ0ZWNyZnNV8bWyrluH30K-wvYOC', null, 10);

-- ── Baseball 2026 Game 4 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Baseball 2026 Game 4', 'baseball-2026-game-4', '2026 baseball', 'https://drive.google.com/thumbnail?id=1W2JXr765JocIDiD3v4qOn2Qwridjr9uw&sz=w1000', 'public', 3)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'baseball-2026-game-4' and c.name = 'Baseball'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'baseball-2026-game-4');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1Eb3F6fYsdOhAK65oZggFpu6PHRRqg96-', null, 0),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1g8DbXiNpAUBeIvPx1k_zXKsfzsjV_EKa', null, 1),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1jcoi93_6Y28PR7DjgZp8DOmBAJwLf6yo', null, 2),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1UPwtdzNQ7geF1QhbRcJ_QxE3rTBEi59O', null, 3),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1yifw_Z-njkmjUIJWNOaeWesga3QW6OOu', null, 4),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1AkVZNvaR6RabVjuWCTE2d77mlloCqzWs', null, 5),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1oThZd9mNPptU5bsLv_Xu8rSTZYGNDo0J', null, 6),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1Wje1tj3H8aDaC2VjOibnFJSbVqgAJrU4', null, 7),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1k925MCzo7DCmcJp8nB02p-G-fGrSGFw1', null, 8),
  ((select id from public.galleries where slug = 'baseball-2026-game-4'), 'photo', '1yeB5ZrURxlUQ-CyxcFor-3A6j2-Wb6kP', null, 9);

-- ── Baseball 2026 Game 5 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Baseball 2026 Game 5', 'baseball-2026-game-5', '2026 baseball', 'https://drive.google.com/thumbnail?id=1QegK_ZGyjrxED7Ui7nDPkrMJLvUc-Gsl&sz=w1000', 'public', 4)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'baseball-2026-game-5' and c.name = 'Baseball'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'baseball-2026-game-5');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1UCeaSLbXPf0doigQiTwmAWzHTlQAqg8o', null, 0),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1bEVkJf7-8wCp23fEs2ocJZWuebYr_xex', null, 1),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1wEIIMMp2xZx2sxO_IkgsuZQDS8sTO1lR', null, 2),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1YpYOrG1sBMMLwNOMzCHx8j42gbQIKmlq', null, 3),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1WeYYtB5YZpfMbh9Pug2_9FNs84uTEVib', null, 4),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1Q8ljWw3cXywd0PrX-vgNnebHmENJmAd8', null, 5),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1eK84lomQ7NRtJ367qAG-IMEwOl2k9wUZ', null, 6),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '1Q7YcvVdd_Nm55270dfCNkGE42rJdH3TB', null, 7),
  ((select id from public.galleries where slug = 'baseball-2026-game-5'), 'photo', '10aPpQfDj7fzrLV21Ad4F3glFxi4VWjQZ', null, 8);

-- ── Baseball 2026 Game 6 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Baseball 2026 Game 6', 'baseball-2026-game-6', '2026 baseball', 'https://drive.google.com/thumbnail?id=1O-XNhZfzJ1AxiLZ_vII7JoYnBEAO-ETy&sz=w1000', 'public', 5)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'baseball-2026-game-6' and c.name = 'Baseball'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'baseball-2026-game-6');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1rRwvbnGrw8K0sFEy3ST5w_xWapWjHlam', null, 0),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1-WvflieiUgmvHtpAam7DhC4HL1z6CNN6', null, 1),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1FOn3ePB-m54ntK0QH3GXMErS-Q6GUS4b', null, 2),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1QP2V4DQPf3q2IaQxM00nNmq5eFQZ4R9H', null, 3),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1T8LxXJx59vPzQLTebRKFUAT-J42-AISZ', null, 4),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1GJL8Nv986v8g2omwzlj0csUuO0tV7VfR', null, 5),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1eIp5egcqBYJNJfyVerbmUuqQ2Xvt7PJ7', null, 6),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '10oz0078Wor8asQpIfgVTXbpDKQ0iBvut', null, 7),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1cScCXfoWSRICJFTDl3GPWmr5Hka7H_8N', null, 8),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1jytitTMXd5bwzfzEc3aDo9LX6U355Luy', null, 9),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1rG3vpBweGe1DY7BryVWa1opsMIwFvywk', null, 10),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1Jp7cmGnp2f61hO2Z7chVsdULbJtSJLSe', null, 11),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '18HUx8YdooSIMUoKW9o5rlingbqB_rpar', null, 12),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1DMUK_W3UlnBhWZQfCHKqZ0u-y3B6pxFR', null, 13),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1MtKKAEB8X55msOpInO1x28wRv-FX2BVJ', null, 14),
  ((select id from public.galleries where slug = 'baseball-2026-game-6'), 'photo', '1UuPHWOfsRbyaiTamhzrD231-Ap42QhH2', null, 15);

-- ── Live Oaks Raider Meet 2025 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Live Oaks Raider Meet 2025', 'live-oaks-raider-meet-2025', 'OH-20221 At live Oaks Raider meet', 'https://drive.google.com/thumbnail?id=1I3xV_mlhfGmxx9jNPIB61gOUz9UuL8oU&sz=w1000', 'public', 6)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'live-oaks-raider-meet-2025' and c.name = 'Raider Challenge'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'live-oaks-raider-meet-2025');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1JBJ2X9K9N_7tixxuuuqvPZMo9P-ow2n0', null, 0),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '18uBRBgjuMcyNxrw1pwWRRWzh5c1GB3az', null, 1),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1I3xV_mlhfGmxx9jNPIB61gOUz9UuL8oU', null, 2),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1E7LkCYZ6eZjP8ZHSe6Rb6BXV087paabe', null, 3),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1-0DURdjHS3lfxEa_dcPQcSZnvkGDEMUV', null, 4),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1f_Jl8C6ar1Jcc9T8I2tdStyv9UeXnzIb', null, 5),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1V3vTguWtlivrB2zDDVUW8LT5vwmpKx5W', null, 6),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1U84Mjrj4-aDQ3IcUaMZ_j1DftKHLJll4', null, 7),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1UdKy0lpNAjIEArykzP8Eku68FDE9ugwn', null, 8),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1I3tzGlBJkQ9SQeqZFhXnpmAfvCsUBMLB', null, 9),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1IkIV85InODCLqY4h3BGDkvKKxrdNPzH9', null, 10),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '18y2yEo2SNs5QZOVTQgQRV__uMI22cqDu', null, 11),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1178cTzmQviYP_OFitIdEO4ZVFEphOc8e', null, 12),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1-4q0l_TDyKpY48EW7XpCL4-1YdM0EEJh', null, 13),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1oZhdxcYj3Rh3vnHFk_IkankheYa5dyxY', null, 14),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '17MMiFYG1TxMpDV7b-EvzwXXdal9001o2', null, 15),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '16SZqQQejx1qk4M5OH0kMdAHPLg0EdI-0', null, 16),
  ((select id from public.galleries where slug = 'live-oaks-raider-meet-2025'), 'photo', '1L6y1FD7VxjoLAMnqcWoD8xPMCSotTwR0', null, 17);

-- ── Home Raider Meet 2025 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Home Raider Meet 2025', 'home-raider-meet-2025', 'The Logan home raider meet', 'https://drive.google.com/thumbnail?id=1KFLCTt9-IpCPlINTRFqrPY5GDhn0brDW&sz=w1000', 'public', 7)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'home-raider-meet-2025' and c.name = 'Raider Challenge'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'home-raider-meet-2025');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1R5WT7ke_NxMcHhpH6IUqzO2QyDeByWtH', null, 0),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1KFLCTt9-IpCPlINTRFqrPY5GDhn0brDW', null, 1),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1Jx3cLXnz67Tl29eo9QN21c0ibU86PhkX', null, 2),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1fRDCX3eiNcl7pehrKcpQrCBbnbDk6th3', null, 3),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1WyEVC2h_5y4UZ6I0Bs2xXGwXSIIcypjx', null, 4),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1ac1qDTN63kG5EdNydUCdGJ4Nlon-gD0x', null, 5),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1aZ2BkUrWgMM57wjGuDnQcW1t_QzC617o', null, 6),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1MHeI3SmLVmChUwQhtIoaq-2GxL4HTkN1', null, 7),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1pS9J66oGG9ANTfnfbxGJnzHY4etEXdu6', null, 8),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1HAh43TWvsg_BJ0WzcqFnSk3Gn3A7yRWD', null, 9),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1x_uZw6YzrGp3hAwyBsGhoySCWodQ74WD', null, 10),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1JUh60ykOr8RvalwRgM6Eb4wg_MIJQ2BI', null, 11),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1i7kG10VoxBHpt7t5HYRE0FrwnUGe60ga', null, 12),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1GYs_2z6HAZCsBOjUpgiaZdKwpAXee3RY', null, 13),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '17omDGBC_bhz2htkOQwd2zIckrv1x7fl3', null, 14),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1F3x6jDe7HwybeAM7WMmqNBpp8AW0XjT9', null, 15),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1h5OHSc2OSxVxrwLLpuQWXW8LMnywGoGI', null, 16),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1SEchYCCJkiur_fwMrIG2-XKMqWJt-wHd', null, 17),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '14-n1YEG9Yt-8tXbmIRMJFv-hIr_TPOAe', null, 18),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1hUoqwburE7MDLVSE1n4_UjqoBvH8GEx2', null, 19),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1xyoiRdNRQzA3KZ4GhRyr8d5mosqMMaBz', null, 20),
  ((select id from public.galleries where slug = 'home-raider-meet-2025'), 'photo', '1kGUlbwIz6BUaXWrdONJPHwciuVJ4d015', null, 21);

-- ── Raider Practice 2025 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Raider Practice 2025', 'raider-practice-2025', 'All pictures from Raider practice 2025', 'https://drive.google.com/thumbnail?id=1j8chrXjf5gSsyqo_JuORVv7qdq0UJZ11&sz=w1000', 'public', 8)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'raider-practice-2025' and c.name = 'Raider Challenge'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'raider-practice-2025');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '15QB5IOvJy1TVMgO6TVXke43Pyk3TnGUR', null, 0),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1rYEFgRUPEXAxPL6IDHHD9dajiiM8eAmG', null, 1),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1f_KEweRicFqrruGFwBe2rSuaH5bXRF0a', null, 2),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1NvHB3NlvuqndxfNJXkUY1UKlE7ROZOf5', null, 3),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1_TJemYN322kOk_FSnRdEOvPVCRGdV45A', null, 4),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1oPiYTlboWnZy5ggiFWXt8MaIc-oluEfU', null, 5),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1xX7ikXXlwcKU60IAzhfWwHRxJpbUWp67', null, 6),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1PZe-SSz5AzjvZWgi08feA8Ls5MZHcNe-', null, 7),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1A5aDw78amGP0bPkq38cpAUAsSM80ADbv', null, 8),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1j8chrXjf5gSsyqo_JuORVv7qdq0UJZ11', null, 9),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1mIFYP72PW9R05LY9SvXe5Ixj_pUuu_M9', null, 10),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1vqqI5Ad3egLsKDSTMyWHcO11J_vsUY8C', null, 11),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1DlKDWGo4d9KjibfpghQk_XNRY6KPMUdq', null, 12),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1ByomuPJD-anJTZ7WiBcct-b33ouw2-xe', null, 13),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1i6eDMfGCqdgIrL3rXDAdMoa33J4k9xv9', null, 14),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1bQDcPWXGYeyei8PQdA0cqqU1TzT4hCsi', null, 15),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1hO3d5JQDnke8B_gGF8KnGKM_OA144CV9', null, 16),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '13ZtgVT2UBeFuudevW083MFucdytKX8Em', null, 17),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1SxxHntRQ1TG9-IEYRezSssItPW0QjDvC', null, 18),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1-ApCRtr2LXFXUz_Nh7Zt0IrfgtrTFDfb', null, 19),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1fS704vu2tcEmE-lECjDsZ0ewF2y_-9bU', null, 20),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1aTVNb6mLvqZfqrpaVv_exvKs0AXVRoSg', null, 21),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '17irlTiYGhugYzBZxjEAbp54VsJOb_12z', null, 22),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1Zn58ws2Fm6sntJC7-LnQXSHeWkHWl6l9', null, 23),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1rmoD9W_cHCkfHtw5HHRb0kE6c7GKkFkq', null, 24),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1VMV0YA20PmTpuSDEz3zQwXfU7fjQ2h_6', null, 25),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1DhOk3ejqaYR22ThFaEa4G2FK6QM_lV9q', null, 26),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1Si_dekrEOEUfX2jMp552TU1aUHpzs_9V', null, 27),
  ((select id from public.galleries where slug = 'raider-practice-2025'), 'photo', '1h4_EZxBNN1d6vO0_7M9F_4wtN9ULnJSG', null, 28);

-- ── Extras 2026 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Extras 2026', 'extras-2026', 'extra media', 'https://drive.google.com/thumbnail?id=1mhecpH2BghXLeGh4qXMtF8Oa5Eb4LARt&sz=w1000', 'public', 9)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'extras-2026' and c.name = 'Extras'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'extras-2026');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'extras-2026'), 'photo', '1DTA9kCLDYnlFsQ6VX_KevUzBzGYuH5Iv', null, 0),
  ((select id from public.galleries where slug = 'extras-2026'), 'photo', '1-lVlMo8BKRxZEvr-tfJbNlY7YSvrnAzR', null, 1),
  ((select id from public.galleries where slug = 'extras-2026'), 'photo', '17XSPyKlADJtpPdqamEyI_I2kcPtGXtuO', null, 2),
  ((select id from public.galleries where slug = 'extras-2026'), 'photo', '1mhecpH2BghXLeGh4qXMtF8Oa5Eb4LARt', null, 3),
  ((select id from public.galleries where slug = 'extras-2026'), 'photo', '1vByxM0dAJ27FJZXRXLkBMR0qEPiyXuYc', null, 4);

-- ── Tennis Pictures 2026 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Tennis Pictures 2026', 'tennis-pictures-2026', 'All Tennis pictures from 2026 season', 'https://drive.google.com/thumbnail?id=1Q7Ywx16Fsrz-gLo9VlDCAr8M_XePZ6Nw&sz=w1000', 'public', 10)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'tennis-pictures-2026' and c.name = 'Tennis'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'tennis-pictures-2026');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'tennis-pictures-2026'), 'photo', '1NNFvqhCwu7iLQAnQSpby0urD97hIgVXb', null, 0),
  ((select id from public.galleries where slug = 'tennis-pictures-2026'), 'photo', '1Su0W0-hWnvM7ifwwR5igjNmfWZZd8n4k', null, 1),
  ((select id from public.galleries where slug = 'tennis-pictures-2026'), 'photo', '19ucXyD77JtecCJ2aHa_uU5oYbbDPA6-R', null, 2),
  ((select id from public.galleries where slug = 'tennis-pictures-2026'), 'photo', '1ew-2s3c5W-wfAsrRgVg_N2D1yVZYAdoS', null, 3),
  ((select id from public.galleries where slug = 'tennis-pictures-2026'), 'photo', '1hLPMR7oayPLnZQBZlXlj10f4QHi2tg-1', null, 4);

-- ── AFJROTC Columbus Crew Game ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('AFJROTC Columbus Crew Game', 'afjrotc-columbus-crew-game', 'crew game 2025', 'https://drive.google.com/thumbnail?id=1miiuDhiY69q3SyCR4m-6UKyJS42aUxHv&sz=w1000', 'public', 11)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'afjrotc-columbus-crew-game' and c.name = 'AFJROTC'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'afjrotc-columbus-crew-game');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '1zpffe-xCc5YUAOC_hok6XpiwIPVqYMFc', null, 0),
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '14WObNrOB2SzYK9kft91ZJaVY-KqPTqnG', null, 1),
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '1JiW6b5Mw4ZawKBbtGp-TyLQ8fipLVeuV', null, 2),
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '1qNF7qP0XMhPdPe1gmiDNgMsxGQqpeToX', null, 3),
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '1miiuDhiY69q3SyCR4m-6UKyJS42aUxHv', null, 4),
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '1JFfGAbEC2GQAmqE2wzr0IScPt7r382TB', null, 5),
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '1WhdaULEUWC1icAopX0LyqQDp6ZZ4qD4V', null, 6),
  ((select id from public.galleries where slug = 'afjrotc-columbus-crew-game'), 'photo', '1C5D5N65LlaVCn5P4736bnV2rIZ8cyBfK', null, 7);

-- ── Fort Knox Photos 2025/2026 ──
insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)
values ('Fort Knox Photos 2025/2026', 'fort-knox-photos-2025-2026', 'Fort Knox Photos from 2025/2026 comp', 'https://drive.google.com/thumbnail?id=1etjM9wsan-DJYQ_ekxw1e4orGjH2VORC&sz=w1000', 'public', 12)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order;
insert into public.gallery_categories (gallery_id, category_id)
select g.id, c.id from public.galleries g, public.categories c
 where g.slug = 'fort-knox-photos-2025-2026' and c.name = 'AFJROTC'
on conflict do nothing;
delete from public.media where gallery_id = (select id from public.galleries where slug = 'fort-knox-photos-2025-2026');
insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '15CYnWpP4bAv465qL-H4pQgp3B9IHUXU_', null, 0),
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '1WtR5ZGl51Cn66N4vpDzBoP0d3mehIdYD', null, 1),
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '1aW2MJor1BHo21WOdRnJeFtxsZJ_-N7I9', null, 2),
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '1vWdI7tBJ-W7g5Exf2BIAnwFQvBbsRRhu', null, 3),
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '1etjM9wsan-DJYQ_ekxw1e4orGjH2VORC', null, 4),
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '1-8NPL4L21YLXksD3dzfE_NBq21Wj0MPS', null, 5),
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '1-Ycc2avwdXxoBfTL9uaJ6JKU2tPHLBrJ', null, 6),
  ((select id from public.galleries where slug = 'fort-knox-photos-2025-2026'), 'photo', '1dZ-spEMN-jw4ovFftuVmk1zykB62ReZb', null, 7);

commit;
