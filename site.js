/* ==========================================================================
   Baptiste Duval — comportements communs à toutes les pages
   1. Menu mobile        3. Visionneuse d'images
   2. Fond « réseau »    4. Terminal interactif (accueil)
   ========================================================================== */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. Menu mobile ---------- */
    var toggle = document.querySelector('.nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
        var setMenu = function (open) {
            links.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        };
        toggle.addEventListener('click', function () { setMenu(!links.classList.contains('is-open')); });
        links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    }

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    /* ---------- 2. Fond « réseau » : des nœuds, des liens, des paquets qui circulent ---------- */
    (function network() {
        var canvas = document.createElement('canvas');
        canvas.id = 'net-bg';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var W, H, nodes, edges, packets, pointer = { x: -9999, y: -9999 }, raf = null;
        var COLORS = ['0, 242, 255', '0, 242, 255', '0, 242, 255', '255, 184, 77'];

        function build() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            var cell = W < 700 ? 110 : 150;
            var cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
            nodes = []; edges = [];
            for (var y = 0; y < rows; y++) {
                for (var x = 0; x < cols; x++) {
                    nodes.push({
                        x: x * cell + (Math.random() - 0.5) * cell * 0.7,
                        y: y * cell + (Math.random() - 0.5) * cell * 0.7,
                        r: Math.random() < 0.14 ? 2.6 : 1.4, out: [], pulse: 0
                    });
                }
            }
            function link(a, b) { edges.push({ a: a, b: b }); nodes[a].out.push(b); nodes[b].out.push(a); }
            for (y = 0; y < rows; y++) {
                for (x = 0; x < cols; x++) {
                    var i = y * cols + x;
                    if (x < cols - 1 && Math.random() < 0.62) link(i, i + 1);
                    if (y < rows - 1 && Math.random() < 0.62) link(i, i + cols);
                    if (x < cols - 1 && y < rows - 1 && Math.random() < 0.14) link(i, i + cols + 1);
                }
            }
            packets = [];
            var count = reduceMotion ? 0 : Math.max(6, Math.round(edges.length / 11));
            for (var p = 0; p < count; p++) packets.push(spawn());
        }

        function spawn() {
            var e = edges[(Math.random() * edges.length) | 0];
            var flip = Math.random() < 0.5;
            return { from: flip ? e.a : e.b, to: flip ? e.b : e.a, t: Math.random(), speed: 0.004 + Math.random() * 0.007, color: COLORS[(Math.random() * COLORS.length) | 0] };
        }

        function near(n) {
            var dx = n.x - pointer.x, dy = n.y - pointer.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            return d < 190 ? 1 - d / 190 : 0;
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            var i, e, a, b, n, k;

            ctx.lineWidth = 1;
            for (i = 0; i < edges.length; i++) {
                e = edges[i]; a = nodes[e.a]; b = nodes[e.b];
                k = Math.max(near(a), near(b));
                ctx.strokeStyle = 'rgba(0, 242, 255, ' + (0.055 + k * 0.3) + ')';
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }

            for (i = 0; i < nodes.length; i++) {
                n = nodes[i];
                if (!n.out.length) continue;
                k = Math.max(near(n), n.pulse);
                ctx.fillStyle = 'rgba(0, 242, 255, ' + (0.28 + k * 0.7) + ')';
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r + k * 2, 0, 6.2832); ctx.fill();
                if (n.pulse > 0.02) {
                    ctx.strokeStyle = 'rgba(0, 242, 255, ' + n.pulse * 0.5 + ')';
                    ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (1 - n.pulse) * 16, 0, 6.2832); ctx.stroke();
                    n.pulse *= 0.94;
                } else { n.pulse = 0; }
            }

            for (i = 0; i < packets.length; i++) {
                var p = packets[i];
                p.t += p.speed;
                a = nodes[p.from]; b = nodes[p.to];
                if (p.t >= 1) {
                    b.pulse = 1;
                    var next = b.out.length > 1 ? b.out.filter(function (o) { return o !== p.from; }) : b.out;
                    p.from = p.to; p.to = next[(Math.random() * next.length) | 0]; p.t = 0;
                    a = nodes[p.from]; b = nodes[p.to];
                }
                var px = a.x + (b.x - a.x) * p.t, py = a.y + (b.y - a.y) * p.t;
                var t0 = Math.max(0, p.t - 0.22);
                var tx = a.x + (b.x - a.x) * t0, ty = a.y + (b.y - a.y) * t0;
                var grad = ctx.createLinearGradient(tx, ty, px, py);
                grad.addColorStop(0, 'rgba(' + p.color + ', 0)');
                grad.addColorStop(1, 'rgba(' + p.color + ', 0.85)');
                ctx.strokeStyle = grad; ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.stroke();
                ctx.fillStyle = 'rgba(' + p.color + ', 1)';
                ctx.beginPath(); ctx.arc(px, py, 1.9, 0, 6.2832); ctx.fill();
            }
        }

        function loop() { draw(); raf = requestAnimationFrame(loop); }
        function start() { if (!raf && !reduceMotion) raf = requestAnimationFrame(loop); }
        function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

        build();
        if (reduceMotion) draw(); else start();

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { if (Math.abs(window.innerWidth - W) > 40 || Math.abs(window.innerHeight - H) > 160) { build(); if (reduceMotion) draw(); } }, 200);
        });
        window.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') { pointer.x = e.clientX; pointer.y = e.clientY; } }, { passive: true });
        document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    })();

    /* ---------- 3. Visionneuse d'images (captures des pages de contenu) ---------- */
    (function lightbox() {
        if (!document.body.classList.contains('legacy')) return;
        var box = null, last = null;
        function open(src, alt) {
            if (!box) {
                box = document.createElement('div');
                box.className = 'lightbox';
                box.setAttribute('role', 'dialog');
                box.setAttribute('aria-modal', 'true');
                box.setAttribute('aria-label', 'Image agrandie');
                box.innerHTML = '<button type="button" aria-label="Fermer">&times;</button><img alt="">';
                box.addEventListener('click', close);
                document.body.appendChild(box);
            }
            var img = box.querySelector('img');
            img.src = src; img.alt = alt || '';
            last = document.activeElement;
            box.classList.add('is-open');
            box.querySelector('button').focus();
        }
        function close() { if (box) { box.classList.remove('is-open'); if (last) last.focus(); } }
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        document.addEventListener('click', function (e) {
            var img = e.target.closest('main img, .main-content img');
            if (!img || img.closest('.lightbox')) return;
            var link = img.closest('a');
            if (link && !/\.(png|jpe?g|webp|gif)$/i.test(link.getAttribute('href') || '')) return;
            e.preventDefault();
            open(link ? link.href : img.currentSrc || img.src, img.alt);
        });
        document.querySelectorAll('main img, .main-content img').forEach(function (img) { img.style.cursor = 'zoom-in'; });
    })();

    /* ---------- 4. Terminal interactif (accueil) ---------- */
    (function terminal() {
        var out = document.getElementById('term-out');
        var form = document.getElementById('term-form');
        var input = document.getElementById('term-input');
        if (!out || !form || !input) return;

        // Une ligne = texte simple, ou [texte, classe], ou [texte, classe, lien]
        var COMMANDS = {
            help: function () {
                return [
                    ['Commandes disponibles :', 't-dim'],
                    '  whoami        qui je suis',
                    '  projets       mes réalisations à la une',
                    '  parcours      formation et expériences',
                    '  competences   ce que je sais faire',
                    '  certifs       certifications',
                    '  mastere       ma formation actuelle',
                    '  cv            ouvrir mon CV',
                    '  contact       me joindre',
                    '  clear         vider le terminal'
                ];
            },
            whoami: function () {
                return [
                    'Baptiste Duval',
                    ['Réseaux, systèmes & cybersécurité', 't-hi'],
                    'Alternant chez IT2i (La Bassée), en Mastère professionnel',
                    'Manager en infrastructures et cybersécurité des SI au CESI.'
                ];
            },
            projets: function () {
                go('realisations');
                return [
                    ['Console de supervision centralisée', '', 'projets.html#console-it2i'],
                    ['Stage au Centre Hospitalier d\'Arras', '', 'projets.html#sae401'],
                    ['Salles de TP virtuelles en conteneurs', '', 'projets.html#sae501'],
                    ['Sécuriser un SI multi-sites', '', 'projets.html#sae.cyber.401'],
                    ['→ les 18 projets du cursus', 't-dim', 'projets.html']
                ];
            },
            parcours: function () {
                go('parcours');
                return [
                    ['Depuis 2026   Mastère professionnel, CESI', 't-ok'],
                    '2025 - 2026   Alternance chez IT2i',
                    'Avril - mai 2025   Stage au Centre Hospitalier d\'Arras',
                    '2023 - 2026   B.U.T. Réseaux et Télécommunications'
                ];
            },
            competences: function () {
                go('competences');
                return [
                    'Administrer   architecture LAN/WAN, services d\'infrastructure',
                    'Connecter     switchs, routeurs, convergence IP',
                    'Programmer    Python, Bash, automatisation',
                    'Sécuriser     firewalling, VPN, audits',
                    'Surveiller    supervision, analyse de logs'
                ];
            },
            certifs: function () {
                return [
                    ['ANSSI_SecNumacadémie', 't-ok'],
                    'Cisco Netacad : introduction à la cybersécurité'
                ];
            },
            mastere: function () {
                return [
                    'Manager en infrastructures et cybersécurité des SI',
                    'CESI, en alternance. Titre RNCP de niveau 7 (Bac+5).',
                    ['→ voir le programme', '', 'futur.html']
                ];
            },
            cv: function () {
                go('cv');
                return [['→ ouvrir CV_DUVALBaptiste.pdf', '', 'static/image/CV_DUVALBaptiste.pdf']];
            },
            contact: function () {
                go('contact');
                return [
                    ['baptisteduval.bd62@gmail.com', '', 'mailto:baptisteduval.bd62@gmail.com'],
                    ['linkedin.com/in/baptiste-duval-6875aa302', '', 'https://www.linkedin.com/in/baptiste-duval-6875aa302/'],
                    ['github.com/baptiste-duval', '', 'https://github.com/baptiste-duval']
                ];
            }
        };
        var ALIASES = { ls: 'projets', projects: 'projets', compétences: 'competences', skills: 'competences', mastère: 'mastere', formation: 'mastere', certifications: 'certifs', '?': 'help', aide: 'help' };

        function go(id) {
            var el = document.getElementById(id);
            if (el) setTimeout(function () { el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }, 650);
        }

        function line(item) {
            var p = document.createElement('p');
            var text = item, cls = '', href = null;
            if (Array.isArray(item)) { text = item[0]; cls = item[1] || ''; href = item[2] || null; }
            if (cls) p.className = cls;
            if (href) {
                var a = document.createElement('a');
                a.href = href; a.textContent = text;
                if (/^https?:|\.pdf$/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
                p.appendChild(a);
            } else {
                p.textContent = text;   // texte brut : la saisie n'est jamais interprétée comme du HTML
            }
            out.appendChild(p);
        }

        function echo(cmd) {
            var p = document.createElement('p');
            p.className = 't-cmd';
            var b = document.createElement('b'); b.textContent = '➜';
            p.append(b, cmd);
            out.appendChild(p);
            return p;
        }

        function run(raw) {
            var cmd = raw.trim().toLowerCase();
            if (!cmd) return;
            echo(raw.trim());
            var name = ALIASES[cmd] || cmd;
            if (name === 'clear') { out.replaceChildren(); return; }
            if (name.indexOf('sudo') === 0) line(['Permission refusée. Bien tenté.', 't-err']);
            else if (COMMANDS[name]) COMMANDS[name]().forEach(line);
            else { line(['commande introuvable : ' + cmd, 't-err']); line(['Tapez help pour la liste des commandes.', 't-dim']); }
            out.scrollTop = out.scrollHeight;
        }

        var history = [], cursor = 0;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var value = input.value;
            if (value.trim()) { history.push(value); cursor = history.length; }
            input.value = '';
            run(value);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); cursor = Math.max(0, cursor - 1); input.value = history[cursor]; }
            if (e.key === 'ArrowDown' && history.length) { e.preventDefault(); cursor = Math.min(history.length, cursor + 1); input.value = history[cursor] || ''; }
        });
        document.querySelectorAll('.term-chips button').forEach(function (btn) {
            btn.addEventListener('click', function () { run(btn.dataset.cmd); });
        });
        document.getElementById('term').addEventListener('click', function (e) {
            if (!e.target.closest('a, button, input') && !String(window.getSelection())) input.focus({ preventScroll: true });
        });

        /* Séquence d'ouverture : la commande whoami se tape toute seule */
        var hint = ['Tapez une commande ou cliquez sur un raccourci.', 't-dim'];
        out.replaceChildren();
        if (reduceMotion) {
            echo('whoami'); COMMANDS.whoami().forEach(line); line(hint);
            return;
        }
        var typed = echo(''), word = 'whoami', n = 0;
        var timer = setInterval(function () {
            typed.lastChild.textContent = word.slice(0, ++n);
            if (n < word.length) return;
            clearInterval(timer);
            setTimeout(function () {
                COMMANDS.whoami().forEach(line);
                setTimeout(function () { line(hint); out.scrollTop = out.scrollHeight; }, 450);
            }, 260);
        }, 85);
    })();
})();
