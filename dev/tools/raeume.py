#!/usr/bin/env python3
"""Die echten Räume für Myzels Hall (Raumwahl „rev.typ“): Impulsantworten aus der OpenAIR-Sammlung (University of York,
CC BY 4.0), aufbereitet zu myzel/raeume/<id>.flac und myzel/raeume/raeume.json (Namen, Herkunft, Lizenz – die App
nennt sie). Einmal laufen lassen, wenn sich die Auswahl ändert:

    python3 dev/tools/raeume.py <arbeitsordner>

Quelle: die Kopie der OpenAIR-Sammlung im öffentlichen audb-Speicher von audEERING (die OpenAIR-Seite selbst ist aus
der Arbeitsumgebung nicht erreichbar); die Dateien sind dieselben (db.csv nennt Name, Kanäle, Abtastrate).
Je Raum: B-Format (W, X, Y, Z – FuMa) wird zu einem ORTF-Paar (zwei Nieren, ±55°), Stereo bleibt; auf 48 kHz
umgerechnet (ffmpeg, soxr), vor dem Direktschall 2 ms gelassen, hinten gekürzt, wo die Hüllkurve im Rauschen versinkt
(10 dB über dessen Pegel, höchstens bis −70 dB), 50 ms ausgeblendet, Spitze auf −1 dBFS, als FLAC 24 bit."""
import csv, io, json, os, subprocess, sys, urllib.request, wave, zipfile   # (wave: writing only)
import numpy as np

S3 = 'https://s3.dualstack.eu-north-1.amazonaws.com/audb-public/openair'
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'myzel')
OUT = os.path.join(APP, 'raeume')
# id, Name in der App, OpenAIR-Datei, Ort/Art (für die Nennung)
RAEUME = [
    ('kathedrale', 'Kathedrale', 'york_minster__stereo__minster1_000_ortf_48k.wav', 'York Minster, England'),
    ('steinkuppel', 'Steinkuppel', 'hamilton_mausoleum__stereo__hm2_000_ortf_48k.wav', 'Hamilton Mausoleum, Schottland'),
    ('konzertsaal', 'Konzertsaal', 'usina_del_arte_symphony_hall__stereo__usina_main_s1_p3.wav', 'Usina del Arte, Buenos Aires'),
    ('kirche', 'Dorfkirche', 'st_patricks_church_patrington__stereo__ortf_s1r1.wav', "St Patrick's Church, Patrington"),
    ('kapelle', 'Kapelle', 'lady_chapel_st_albans_cathedral__stereo__stalbans_a_ortf.wav', 'Lady Chapel, St Albans Cathedral'),
    ('kirchenschiff', 'Kirchenschiff', 'st_margarets_church_national_centre_early_music__b-format__r8_1st_configuration.wav', "St Margaret's Church, York"),
    ('marmorhalle', 'Marmorhalle', 'elveden_hall_suffolk_england__stereo__1a_marble_hall.wav', 'Elveden Hall, Suffolk'),
    ('kammer', 'Kammer', 'elveden_hall_suffolk_england__stereo__18a_smoking_room.wav', 'Elveden Hall, Suffolk (Rauchzimmer)'),
    ('ratssaal', 'Ratssaal', 'york_guildhall_council_chamber__b-format__councilchamber_s1_r3_ir_1_96000.wav', 'York Guildhall, Council Chamber'),
    ('saal', 'Kleiner Saal', 'jack_lyons_concert_hall_university_york__b-format__rir_jack_lyons_lp1_96k.wav', 'Jack Lyons Concert Hall, York'),
    ('steinkammer', 'Steinkammer', 'maes_howe__stereo__mh3_000_ortf_48k.wav', 'Maeshowe, Orkney (Grabkammer)'),
    ('ganggrab', 'Ganggrab', 'newgrange__b-format__newgrange_s1r1_2.wav', 'Newgrange, Irland'),
    ('verlies', 'Verlies', 'falkland_palace_bottle_dungeon__b-format__bottledungeon1_sf_edited.wav', 'Falkland Palace, Flaschenverlies'),
    ('hoehle', 'Höhle', 'creswell_crags__b-format__1_s_mainlevel_r_mainlevel.wav', 'Creswell Crags, England'),
    ('schlucht', 'Schlucht', 'trollers_gill__b-format__dales_site1_4way_bformat.wav', "Troller's Gill, Yorkshire Dales"),
    ('tunnel', 'Tunnel', 'innocent_railway_tunnel__b-format__tunnel_entrance_d_4way_bformat.wav', 'Innocent Railway Tunnel, Edinburgh'),
    ('stollen', 'Stollen', 'gill_heads_mine__b-format__mine_site1_1way_bformat.wav', 'Gill Heads Mine, Yorkshire'),
    ('kalkofen', 'Kalkofen', 'hoffmann_lime_kiln_langcliffeuk__b-format__ir_p1.wav', 'Hoffmann-Kalkofen, Langcliffe'),
    ('sommerwald', 'Sommerwald', 'koli_national_park_summer__b-format__koli_summer_site2_4way_bformat.wav', 'Koli-Nationalpark, Finnland (Sommer)'),
    ('winterwald', 'Winterwald', 'koli_national_park_winter__b-format__koli_snow_site3_4way_bformat.wav', 'Koli-Nationalpark, Finnland (Winter, Schnee)'),
    ('reaktorhalle', 'Reaktorhalle', 'r1_nuclear_reactor_hall__stereo__r1_ortf-48k.wav', 'R1-Reaktorhalle, Stockholm'),
    ('treppenhaus', 'Treppenhaus', 'stairway_university_york__stereo__stairwell_ortf.wav', 'Treppenhaus, University of York'),
    ('klangskulptur', 'Klangskulptur', 'tvisongur_sound_sculpture_iceland_model__stereo__source4domedoreceiver1domefabinaural.wav', 'Tvísöngur, Seyðisfjörður (Island)'),
]


def read_wav(b, work):
    """any WAV (PCM 16/24/32, float, extensible) through ffmpeg: [n, ch] float, its rate"""
    tmp = os.path.join(work, '_in.wav'); open(tmp, 'wb').write(b)
    info = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', tmp], capture_output=True, text=True, check=True).stdout.strip().split(',')
    sr, ch = int(info[0]), int(info[1])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', tmp, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<f4').astype(float).reshape(-1, ch), sr


def ortf(x):
    if x.shape[1] == 2: return x
    W, X, Y = x[:, 0] * np.sqrt(2), x[:, 1], x[:, 2]
    a = np.radians(55)
    return np.stack([0.5 * W + 0.5 * (np.cos(a) * X + np.sin(a) * Y), 0.5 * W + 0.5 * (np.cos(a) * X - np.sin(a) * Y)], 1)


def main(work):
    os.makedirs(work, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    db = os.path.join(work, 'db.csv')
    if not os.path.exists(db):
        z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(f'{S3}/1.0.0/db.zip').read())); open(db, 'wb').write(z.read('db.csv'))
    arch = {r[''].split('/', 1)[1]: r['archive'] for r in csv.DictReader(open(db)) if r[''].startswith('wav/')}
    meta = []
    for rid, name, f, where in RAEUME:
        z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(f'{S3}/media/1.0.0/{arch[f]}.zip').read()))
        x, sr = read_wav(z.read('wav/' + f), work); x = ortf(x)
        tmp = os.path.join(work, rid + '.f32')
        x.astype('<f4').tofile(tmp)
        r48 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', tmp, '-af', 'aresample=48000:resampler=soxr:precision=28', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        y = np.frombuffer(r48, '<f4').reshape(-1, 2).astype(float)
        m = np.abs(y).max(1); i0 = int(np.argmax(m > 0.1 * m.max())); y = y[max(0, i0 - 96):]
        # the end: where the envelope (50 ms) sinks to 10 dB over the noise (its last 10 %)
        e = np.sqrt(np.convolve((y ** 2).mean(1), np.ones(2400) / 2400, 'same')) + 1e-12
        floor = np.median(e[int(len(e) * 0.9):]); end = len(e) - 1
        thr = max(floor * 3.16, e.max() * 3.16e-4)   # (10 dB over the noise, at most down to −70 dB)
        cm = np.minimum.accumulate(e[int(np.argmax(e)):]); below = np.where(cm < thr)[0]   # (the first time it gets there – a blip later does not count)
        if len(below): end = min(len(e), int(np.argmax(e)) + below[0] + 2400)
        y = y[:end]; f50 = min(2400, len(y) // 4); y[-f50:] *= np.linspace(1, 0, f50)[:, None]
        y *= 0.891 / np.abs(y).max()
        wav = os.path.join(work, rid + '.wav'); ww = wave.open(wav, 'wb'); ww.setnchannels(2); ww.setsampwidth(3); ww.setframerate(48000)
        v = np.clip(np.round(y * 8388607), -8388607, 8388607).astype('<i4'); b = np.zeros((len(v), 2, 3), np.uint8)
        for k in range(3): b[:, :, k] = (v >> (8 * k)) & 255
        ww.writeframes(b.tobytes()); ww.close()
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'flac', '-compression_level', '12', os.path.join(OUT, rid + '.flac')], check=True)
        meta.append({'id': rid, 'name': name, 'ort': where, 'datei': f, 'sekunden': round(len(y) / 48000, 2), 'kb': os.path.getsize(os.path.join(OUT, rid + '.flac')) // 1024})
        print(rid, meta[-1]['sekunden'], 's', meta[-1]['kb'], 'kB')
    json.dump({'quelle': 'OpenAIR – Open Acoustic Impulse Response Library, University of York (www.openair.hosted.york.ac.uk)', 'lizenz': 'CC BY 4.0 (creativecommons.org/licenses/by/4.0)',
               'bearbeitet': 'zu Stereo (ORTF aus B-Format), 48 kHz, gekürzt und ausgeblendet, normiert', 'raeume': meta}, open(os.path.join(OUT, 'raeume.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'raeume-arbeit')
