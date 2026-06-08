-- ============================================================
-- POLLA MUNDIAL 2026 — Seed data
-- Aplicar DESPUÉS de schema.sql (mismo SQL Editor).
-- Fixture: NBC Sports (https://www.nbcsports.com/soccer/news/2026-world-cup-schedule-confirmed-dates-times-stadiums-full-details)
-- Horarios: convertidos de ET (UTC-4 en jun/jul 2026) a UTC.
-- ============================================================

-- ---------- Settings ----------
insert into public.settings (id, tournament_name, tournament_start_at, match_prediction_cutoff_minutes)
values (1, 'Polla Mundial 2026', '2026-06-11 19:00:00+00', 10)
on conflict (id) do update set
  tournament_name = excluded.tournament_name,
  tournament_start_at = excluded.tournament_start_at,
  match_prediction_cutoff_minutes = excluded.match_prediction_cutoff_minutes;

-- ---------- Groups ----------
insert into public.groups (code, name) values
  ('A','Grupo A'), ('B','Grupo B'), ('C','Grupo C'),
  ('D','Grupo D'), ('E','Grupo E'), ('F','Grupo F'),
  ('G','Grupo G'), ('H','Grupo H'), ('I','Grupo I'),
  ('J','Grupo J'), ('K','Grupo K'), ('L','Grupo L')
on conflict (code) do update set name = excluded.name;

-- ---------- Tournament results (singleton row, vacío por ahora) ----------
insert into public.tournament_results (id) values (1) on conflict (id) do nothing;

-- ---------- Teams (48) ----------
insert into public.teams (id, name, flag_emoji, confederation, group_code) values
  -- Group A
  ('MEX','México','🇲🇽','CONCACAF','A'),
  ('RSA','Sudáfrica','🇿🇦','CAF','A'),
  ('KOR','Corea del Sur','🇰🇷','AFC','A'),
  ('CZE','República Checa','🇨🇿','UEFA','A'),
  -- Group B
  ('CAN','Canadá','🇨🇦','CONCACAF','B'),
  ('BIH','Bosnia y Herzegovina','🇧🇦','UEFA','B'),
  ('QAT','Qatar','🇶🇦','AFC','B'),
  ('SUI','Suiza','🇨🇭','UEFA','B'),
  -- Group C
  ('BRA','Brasil','🇧🇷','CONMEBOL','C'),
  ('MAR','Marruecos','🇲🇦','CAF','C'),
  ('HAI','Haití','🇭🇹','CONCACAF','C'),
  ('SCO','Escocia','🏴󠁧󠁢󠁳󠁣󠁴󠁿','UEFA','C'),
  -- Group D
  ('USA','Estados Unidos','🇺🇸','CONCACAF','D'),
  ('PAR','Paraguay','🇵🇾','CONMEBOL','D'),
  ('AUS','Australia','🇦🇺','AFC','D'),
  ('TUR','Turquía','🇹🇷','UEFA','D'),
  -- Group E
  ('GER','Alemania','🇩🇪','UEFA','E'),
  ('CUW','Curazao','🇨🇼','CONCACAF','E'),
  ('CIV','Costa de Marfil','🇨🇮','CAF','E'),
  ('ECU','Ecuador','🇪🇨','CONMEBOL','E'),
  -- Group F
  ('NED','Países Bajos','🇳🇱','UEFA','F'),
  ('JPN','Japón','🇯🇵','AFC','F'),
  ('SWE','Suecia','🇸🇪','UEFA','F'),
  ('TUN','Túnez','🇹🇳','CAF','F'),
  -- Group G
  ('IRN','Irán','🇮🇷','AFC','G'),
  ('NZL','Nueva Zelanda','🇳🇿','OFC','G'),
  ('BEL','Bélgica','🇧🇪','UEFA','G'),
  ('EGY','Egipto','🇪🇬','CAF','G'),
  -- Group H
  ('ESP','España','🇪🇸','UEFA','H'),
  ('CPV','Cabo Verde','🇨🇻','CAF','H'),
  ('KSA','Arabia Saudita','🇸🇦','AFC','H'),
  ('URU','Uruguay','🇺🇾','CONMEBOL','H'),
  -- Group I
  ('FRA','Francia','🇫🇷','UEFA','I'),
  ('SEN','Senegal','🇸🇳','CAF','I'),
  ('IRQ','Irak','🇮🇶','AFC','I'),
  ('NOR','Noruega','🇳🇴','UEFA','I'),
  -- Group J
  ('ARG','Argentina','🇦🇷','CONMEBOL','J'),
  ('ALG','Argelia','🇩🇿','CAF','J'),
  ('AUT','Austria','🇦🇹','UEFA','J'),
  ('JOR','Jordania','🇯🇴','AFC','J'),
  -- Group K
  ('POR','Portugal','🇵🇹','UEFA','K'),
  ('COD','RD Congo','🇨🇩','CAF','K'),
  ('UZB','Uzbekistán','🇺🇿','AFC','K'),
  ('COL','Colombia','🇨🇴','CONMEBOL','K'),
  -- Group L
  ('ENG','Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿','UEFA','L'),
  ('CRO','Croacia','🇭🇷','UEFA','L'),
  ('GHA','Ghana','🇬🇭','CAF','L'),
  ('PAN','Panamá','🇵🇦','CONCACAF','L')
on conflict (id) do update set
  name = excluded.name,
  flag_emoji = excluded.flag_emoji,
  confederation = excluded.confederation,
  group_code = excluded.group_code;

-- ---------- Matches (104) ----------
-- Fase de grupos (1..72) — horarios en UTC
insert into public.matches (id, stage, group_code, home_team_id, away_team_id, kickoff_at, venue, city, country) values
  -- Grupo A
  (1,'group','A','MEX','RSA','2026-06-11 19:00:00+00','Estadio Azteca','Ciudad de México','México'),
  (2,'group','A','KOR','CZE','2026-06-12 02:00:00+00','Estadio Akron','Guadalajara','México'),
  (3,'group','A','CZE','RSA','2026-06-18 16:00:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  (4,'group','A','MEX','KOR','2026-06-19 01:00:00+00','Estadio Akron','Guadalajara','México'),
  (5,'group','A','CZE','MEX','2026-06-25 01:00:00+00','Estadio Azteca','Ciudad de México','México'),
  (6,'group','A','RSA','KOR','2026-06-25 01:00:00+00','Estadio BBVA','Monterrey','México'),
  -- Grupo B
  (7,'group','B','CAN','BIH','2026-06-12 19:00:00+00','BMO Field','Toronto','Canadá'),
  (8,'group','B','QAT','SUI','2026-06-13 19:00:00+00','Levi''s Stadium','San Francisco Bay Area','USA'),
  (9,'group','B','SUI','BIH','2026-06-18 19:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (10,'group','B','CAN','QAT','2026-06-18 22:00:00+00','BC Place','Vancouver','Canadá'),
  (11,'group','B','SUI','CAN','2026-06-24 19:00:00+00','BC Place','Vancouver','Canadá'),
  (12,'group','B','BIH','QAT','2026-06-24 19:00:00+00','Lumen Field','Seattle','USA'),
  -- Grupo C
  (13,'group','C','BRA','MAR','2026-06-13 22:00:00+00','MetLife Stadium','New York/New Jersey','USA'),
  (14,'group','C','HAI','SCO','2026-06-14 01:00:00+00','Gillette Stadium','Boston','USA'),
  (15,'group','C','SCO','MAR','2026-06-19 22:00:00+00','Gillette Stadium','Boston','USA'),
  (16,'group','C','BRA','HAI','2026-06-20 01:00:00+00','Lincoln Financial Field','Filadelfia','USA'),
  (17,'group','C','SCO','BRA','2026-06-24 22:00:00+00','Hard Rock Stadium','Miami','USA'),
  (18,'group','C','MAR','HAI','2026-06-24 22:00:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  -- Grupo D
  (19,'group','D','USA','PAR','2026-06-13 01:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (20,'group','D','AUS','TUR','2026-06-13 04:00:00+00','BC Place','Vancouver','Canadá'),
  (21,'group','D','USA','AUS','2026-06-19 19:00:00+00','Lumen Field','Seattle','USA'),
  (22,'group','D','TUR','PAR','2026-06-19 04:00:00+00','Levi''s Stadium','San Francisco Bay Area','USA'),
  (23,'group','D','TUR','USA','2026-06-26 02:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (24,'group','D','PAR','AUS','2026-06-26 02:00:00+00','Levi''s Stadium','San Francisco Bay Area','USA'),
  -- Grupo E
  (25,'group','E','GER','CUW','2026-06-14 17:00:00+00','NRG Stadium','Houston','USA'),
  (26,'group','E','CIV','ECU','2026-06-14 23:00:00+00','Lincoln Financial Field','Filadelfia','USA'),
  (27,'group','E','GER','CIV','2026-06-20 20:00:00+00','BMO Field','Toronto','Canadá'),
  (28,'group','E','ECU','CUW','2026-06-21 00:00:00+00','Arrowhead Stadium','Kansas City','USA'),
  (29,'group','E','ECU','GER','2026-06-25 20:00:00+00','MetLife Stadium','New York/New Jersey','USA'),
  (30,'group','E','CUW','CIV','2026-06-25 20:00:00+00','Lincoln Financial Field','Filadelfia','USA'),
  -- Grupo F
  (31,'group','F','NED','JPN','2026-06-14 20:00:00+00','AT&T Stadium','Dallas','USA'),
  (32,'group','F','SWE','TUN','2026-06-15 02:00:00+00','Estadio BBVA','Monterrey','México'),
  (33,'group','F','NED','SWE','2026-06-20 17:00:00+00','NRG Stadium','Houston','USA'),
  (34,'group','F','TUN','JPN','2026-06-20 04:00:00+00','Estadio BBVA','Monterrey','México'),
  (35,'group','F','JPN','SWE','2026-06-25 23:00:00+00','AT&T Stadium','Dallas','USA'),
  (36,'group','F','TUN','NED','2026-06-25 23:00:00+00','Arrowhead Stadium','Kansas City','USA'),
  -- Grupo G
  (37,'group','G','IRN','NZL','2026-06-16 01:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (38,'group','G','BEL','EGY','2026-06-15 19:00:00+00','Lumen Field','Seattle','USA'),
  (39,'group','G','BEL','IRN','2026-06-21 19:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (40,'group','G','NZL','EGY','2026-06-22 01:00:00+00','BC Place','Vancouver','Canadá'),
  (41,'group','G','EGY','IRN','2026-06-27 03:00:00+00','Lumen Field','Seattle','USA'),
  (42,'group','G','NZL','BEL','2026-06-27 03:00:00+00','BC Place','Vancouver','Canadá'),
  -- Grupo H
  (43,'group','H','ESP','CPV','2026-06-15 16:00:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  (44,'group','H','KSA','URU','2026-06-15 22:00:00+00','Hard Rock Stadium','Miami','USA'),
  (45,'group','H','ESP','KSA','2026-06-21 16:00:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  (46,'group','H','URU','CPV','2026-06-21 22:00:00+00','Hard Rock Stadium','Miami','USA'),
  (47,'group','H','CPV','KSA','2026-06-27 00:00:00+00','NRG Stadium','Houston','USA'),
  (48,'group','H','URU','ESP','2026-06-27 00:00:00+00','Estadio Akron','Guadalajara','México'),
  -- Grupo I
  (49,'group','I','FRA','SEN','2026-06-16 19:00:00+00','MetLife Stadium','New York/New Jersey','USA'),
  (50,'group','I','IRQ','NOR','2026-06-16 22:00:00+00','Gillette Stadium','Boston','USA'),
  (51,'group','I','FRA','IRQ','2026-06-22 21:00:00+00','Lincoln Financial Field','Filadelfia','USA'),
  (52,'group','I','NOR','SEN','2026-06-23 00:00:00+00','MetLife Stadium','New York/New Jersey','USA'),
  (53,'group','I','NOR','FRA','2026-06-26 19:00:00+00','Gillette Stadium','Boston','USA'),
  (54,'group','I','SEN','IRQ','2026-06-26 19:00:00+00','BMO Field','Toronto','Canadá'),
  -- Grupo J
  (55,'group','J','ARG','ALG','2026-06-17 01:00:00+00','Arrowhead Stadium','Kansas City','USA'),
  (56,'group','J','AUT','JOR','2026-06-16 04:00:00+00','Levi''s Stadium','San Francisco Bay Area','USA'),
  (57,'group','J','ARG','AUT','2026-06-22 17:00:00+00','AT&T Stadium','Dallas','USA'),
  (58,'group','J','JOR','ALG','2026-06-23 03:00:00+00','Levi''s Stadium','San Francisco Bay Area','USA'),
  (59,'group','J','ALG','AUT','2026-06-28 02:00:00+00','Arrowhead Stadium','Kansas City','USA'),
  (60,'group','J','JOR','ARG','2026-06-28 02:00:00+00','AT&T Stadium','Dallas','USA'),
  -- Grupo K
  (61,'group','K','POR','COD','2026-06-17 17:00:00+00','NRG Stadium','Houston','USA'),
  (62,'group','K','UZB','COL','2026-06-18 02:00:00+00','Estadio Azteca','Ciudad de México','México'),
  (63,'group','K','POR','UZB','2026-06-23 17:00:00+00','NRG Stadium','Houston','USA'),
  (64,'group','K','COL','COD','2026-06-24 02:00:00+00','Estadio Akron','Guadalajara','México'),
  (65,'group','K','COL','POR','2026-06-27 23:30:00+00','Hard Rock Stadium','Miami','USA'),
  (66,'group','K','COD','UZB','2026-06-27 23:30:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  -- Grupo L
  (67,'group','L','ENG','CRO','2026-06-17 20:00:00+00','AT&T Stadium','Dallas','USA'),
  (68,'group','L','GHA','PAN','2026-06-17 23:00:00+00','BMO Field','Toronto','Canadá'),
  (69,'group','L','ENG','GHA','2026-06-23 20:00:00+00','Gillette Stadium','Boston','USA'),
  (70,'group','L','PAN','CRO','2026-06-23 23:00:00+00','BMO Field','Toronto','Canadá'),
  (71,'group','L','PAN','ENG','2026-06-27 21:00:00+00','MetLife Stadium','New York/New Jersey','USA'),
  (72,'group','L','CRO','GHA','2026-06-27 21:00:00+00','Lincoln Financial Field','Filadelfia','USA')
on conflict (id) do update set
  stage = excluded.stage, group_code = excluded.group_code,
  home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id,
  kickoff_at = excluded.kickoff_at, venue = excluded.venue,
  city = excluded.city, country = excluded.country;

-- Eliminatorias (73..104) — equipos aún no determinados; usamos placeholders
insert into public.matches (id, stage, home_placeholder, away_placeholder, kickoff_at, venue, city, country) values
  -- Round of 32 (73..88)
  (73,'r32','2° Grupo A','2° Grupo B','2026-06-28 19:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (74,'r32','1° Grupo E','3° A/B/C/D/F','2026-06-29 20:30:00+00','Gillette Stadium','Boston','USA'),
  (75,'r32','1° Grupo F','2° Grupo C','2026-06-30 01:00:00+00','Estadio BBVA','Monterrey','México'),
  (76,'r32','1° Grupo C','2° Grupo F','2026-06-29 17:00:00+00','NRG Stadium','Houston','USA'),
  (77,'r32','1° Grupo I','3° C/D/F/G/H','2026-06-30 21:00:00+00','MetLife Stadium','New York/New Jersey','USA'),
  (78,'r32','2° Grupo E','2° Grupo I','2026-06-30 17:00:00+00','AT&T Stadium','Dallas','USA'),
  (79,'r32','1° Grupo A','3° C/E/F/H/I','2026-07-01 01:00:00+00','Estadio Azteca','Ciudad de México','México'),
  (80,'r32','1° Grupo L','3° E/H/I/J/K','2026-07-01 16:00:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  (81,'r32','1° Grupo D','3° B/E/F/I/J','2026-07-02 00:00:00+00','Levi''s Stadium','San Francisco Bay Area','USA'),
  (82,'r32','1° Grupo G','3° A/E/H/I/J','2026-07-01 20:00:00+00','Lumen Field','Seattle','USA'),
  (83,'r32','2° Grupo K','2° Grupo L','2026-07-02 23:00:00+00','BMO Field','Toronto','Canadá'),
  (84,'r32','1° Grupo H','2° Grupo J','2026-07-02 19:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (85,'r32','1° Grupo B','3° E/F/G/I/J','2026-07-03 03:00:00+00','BC Place','Vancouver','Canadá'),
  (86,'r32','1° Grupo J','2° Grupo H','2026-07-03 22:00:00+00','Hard Rock Stadium','Miami','USA'),
  (87,'r32','1° Grupo K','3° D/E/I/J/L','2026-07-04 01:30:00+00','Arrowhead Stadium','Kansas City','USA'),
  (88,'r32','2° Grupo D','2° Grupo G','2026-07-03 18:00:00+00','AT&T Stadium','Dallas','USA'),
  -- Round of 16 (89..96)
  (89,'r16','Ganador M74','Ganador M77','2026-07-04 21:00:00+00','Lincoln Financial Field','Filadelfia','USA'),
  (90,'r16','Ganador M73','Ganador M75','2026-07-04 17:00:00+00','NRG Stadium','Houston','USA'),
  (91,'r16','Ganador M76','Ganador M78','2026-07-05 20:00:00+00','MetLife Stadium','New York/New Jersey','USA'),
  (92,'r16','Ganador M79','Ganador M80','2026-07-06 00:00:00+00','Estadio Azteca','Ciudad de México','México'),
  (93,'r16','Ganador M83','Ganador M84','2026-07-06 19:00:00+00','AT&T Stadium','Dallas','USA'),
  (94,'r16','Ganador M81','Ganador M82','2026-07-07 00:00:00+00','Lumen Field','Seattle','USA'),
  (95,'r16','Ganador M86','Ganador M88','2026-07-07 16:00:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  (96,'r16','Ganador M85','Ganador M87','2026-07-07 20:00:00+00','BC Place','Vancouver','Canadá'),
  -- Cuartos (97..100)
  (97,'qf','Ganador M89','Ganador M90','2026-07-09 20:00:00+00','Gillette Stadium','Boston','USA'),
  (98,'qf','Ganador M93','Ganador M94','2026-07-10 19:00:00+00','SoFi Stadium','Los Ángeles','USA'),
  (99,'qf','Ganador M91','Ganador M92','2026-07-11 21:00:00+00','Hard Rock Stadium','Miami','USA'),
  (100,'qf','Ganador M95','Ganador M96','2026-07-12 01:00:00+00','Arrowhead Stadium','Kansas City','USA'),
  -- Semis (101..102)
  (101,'sf','Ganador M97','Ganador M98','2026-07-14 19:00:00+00','AT&T Stadium','Dallas','USA'),
  (102,'sf','Ganador M99','Ganador M100','2026-07-15 19:00:00+00','Mercedes-Benz Stadium','Atlanta','USA'),
  -- Tercer puesto (103)
  (103,'third_place','Perdedor M101','Perdedor M102','2026-07-18 21:00:00+00','Hard Rock Stadium','Miami','USA'),
  -- Final (104)
  (104,'final','Ganador M101','Ganador M102','2026-07-19 19:00:00+00','MetLife Stadium','New York/New Jersey','USA')
on conflict (id) do update set
  stage = excluded.stage,
  home_placeholder = excluded.home_placeholder,
  away_placeholder = excluded.away_placeholder,
  kickoff_at = excluded.kickoff_at,
  venue = excluded.venue,
  city = excluded.city,
  country = excluded.country;

-- ---------- Avance entre rondas ----------
-- R32 → R16
update public.matches set winner_to_match_id = 90, winner_to_slot = 'home' where id = 73;
update public.matches set winner_to_match_id = 89, winner_to_slot = 'home' where id = 74;
update public.matches set winner_to_match_id = 90, winner_to_slot = 'away' where id = 75;
update public.matches set winner_to_match_id = 91, winner_to_slot = 'home' where id = 76;
update public.matches set winner_to_match_id = 89, winner_to_slot = 'away' where id = 77;
update public.matches set winner_to_match_id = 91, winner_to_slot = 'away' where id = 78;
update public.matches set winner_to_match_id = 92, winner_to_slot = 'home' where id = 79;
update public.matches set winner_to_match_id = 92, winner_to_slot = 'away' where id = 80;
update public.matches set winner_to_match_id = 94, winner_to_slot = 'home' where id = 81;
update public.matches set winner_to_match_id = 94, winner_to_slot = 'away' where id = 82;
update public.matches set winner_to_match_id = 93, winner_to_slot = 'home' where id = 83;
update public.matches set winner_to_match_id = 93, winner_to_slot = 'away' where id = 84;
update public.matches set winner_to_match_id = 96, winner_to_slot = 'home' where id = 85;
update public.matches set winner_to_match_id = 95, winner_to_slot = 'home' where id = 86;
update public.matches set winner_to_match_id = 96, winner_to_slot = 'away' where id = 87;
update public.matches set winner_to_match_id = 95, winner_to_slot = 'away' where id = 88;

-- R16 → QF
update public.matches set winner_to_match_id = 97, winner_to_slot = 'home' where id = 89;
update public.matches set winner_to_match_id = 97, winner_to_slot = 'away' where id = 90;
update public.matches set winner_to_match_id = 99, winner_to_slot = 'home' where id = 91;
update public.matches set winner_to_match_id = 99, winner_to_slot = 'away' where id = 92;
update public.matches set winner_to_match_id = 98, winner_to_slot = 'home' where id = 93;
update public.matches set winner_to_match_id = 98, winner_to_slot = 'away' where id = 94;
update public.matches set winner_to_match_id = 100, winner_to_slot = 'home' where id = 95;
update public.matches set winner_to_match_id = 100, winner_to_slot = 'away' where id = 96;

-- QF → SF
update public.matches set winner_to_match_id = 101, winner_to_slot = 'home' where id = 97;
update public.matches set winner_to_match_id = 101, winner_to_slot = 'away' where id = 98;
update public.matches set winner_to_match_id = 102, winner_to_slot = 'home' where id = 99;
update public.matches set winner_to_match_id = 102, winner_to_slot = 'away' where id = 100;

-- SF → Final + Tercer puesto (perdedor de SF va al tercer puesto)
update public.matches set
  winner_to_match_id = 104, winner_to_slot = 'home',
  loser_to_match_id = 103, loser_to_slot = 'home'
  where id = 101;
update public.matches set
  winner_to_match_id = 104, winner_to_slot = 'away',
  loser_to_match_id = 103, loser_to_slot = 'away'
  where id = 102;
