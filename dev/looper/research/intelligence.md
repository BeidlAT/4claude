# What "intelligence" can mean in Myzel's looper, and what runs on a phone today

Research report for the new looper. Status: 18 October 2026. Author: research session for the looper concept.

**About the sources.** The agent proxy in this session blocked direct reads of most academic sites (arXiv, NIME, IRCAM, HAL, Goldsmiths, Sony CSL, Hugging Face, caniuse, webkit.org). This report therefore rests on three things: web-search summaries of those pages, pages that could be read in full (GitHub READMEs, MDN's browser-compat-data on GitHub, Magenta's checkpoint list), and my own background knowledge of these systems. Each claim names its source URL. Numbers I could not check against a primary source are marked *(unverified)*, and my own estimates are marked *(estimate)*. Code facts about Myzel come from `dev/looper/research/code-map.md` and a few greps of `myzel/index.html`.

---

## 0. Summary

- **Most of the musical intelligence a looper needs is symbolic, and Myzel already produces the symbols.** Every note comes from a scale degree (`N.notes`, `degNote`), every finger passes `onDown`, and the Puls has a beat clock (`SEQ`, `beatAt/timeAt`). A looper that also stores the *events* of each pass can do what the research systems do: tempo and bar inference, scale-following transposition, groove-preserving quantisation, role detection, variation, call and response, and accompaniment. The algorithms are cheap (well under a millisecond per decision), deterministic and testable. They need no neural network, no ML runtime and no cross-origin isolation.
- **The neural systems split cleanly into two groups.** Small *symbolic* or *analysis* models are feasible in principle on phones: Piano Genie-, Notochord- or GrooVAE-sized RNNs, PESTO pitch (130 k parameters), and Basic Pitch or Harmonica-nano transcription (about 17–36 k parameters). The catch is that the runtimes and published checkpoints are far larger than the models. ONNX Runtime Web's WASM is about 11 MB, GrooVAE checkpoints are 15.8 MB, and both are far too big for a 1.4 MB single file. *Audio-generative* models do not run in a phone browser in October 2026. Magenta RealTime 2 needs Apple Silicon Macs, Lyria RealTime is a Google server API, and RAVE/DDSP timbre transfer would compete with Myzel's own DSP for a single thread and replace Myzel's sound with someone else's.
- **Ranked recommendation (§5):**
  1. "Service intelligence" that never changes your notes unasked: free-tempo bar inference with automatic loop closing and retroactive capture, scale following, groove-preserving quantisation, and seam smoothing.
  2. A Reflexive-Looper-style **role model** that brings in the layers you are *not* playing.
  3. A **variation engine** with one "Eigensinn" knob, an anchor and a forecast display.
  4. Energy following.
  5. Rule-based **accompaniment** (chords and bass from a melody loop).
  6. Continuator/factor-oracle **answers** from your own material.
  7. Audio-loop helpers.
  8. Optionally, later and only after measurement, a tiny hand-written RNN prior.
- **The biggest open question is not AI but voices.** Intelligence needs event loops, and event loops re-perform through Myzel's voices, so each layer consumes voice budget (`VBUDGET` is 14 units on mobile at level 1). Audio loops are cheap and exact but cannot follow scale or tempo without processing the owner has ruled out (no time-stretch). That trade-off is for the owner to decide (§7).

---

## 1. What "intelligence" in a looper can mean musically

A plain looper only *remembers*. The research systems below add up to five functions, and it helps to name them:

| Function | Question it answers | Examples below |
|---|---|---|
| **Hören** (listen) | What is being played: tempo, bar, key, role, phrase, groove, energy? | Cypher's listener, BeatNet, Reflexive Looper's mode classifier |
| **Erinnern** (remember) | What material do I have, and in whose style? | Continuator's Markov tree, OMax's factor oracle, Somax corpus |
| **Entscheiden** (decide) | When do I play, how much, and imitate, oppose or ignore? | Voyager, Spire Muse autonomy axis, Reflexive Looper's "other members" rule |
| **Spielen** (act) | What exactly do I play? | variations, continuations, accompaniment, answers |
| **Zeigen** (show) | Can the player anticipate and veto it? | ReaLJam's plan display, McCormack's emoticon drummer, Agents in Concert's forecast |

There are also two very different kinds of intelligence, and the UI should keep them apart:

- **Service intelligence** makes the loop *right*: it finds the bar length, closes the loop at the right moment, keeps the groove, follows the scale and hides the seam. The musician never wants this switched off, and it never adds or removes notes.
- **Co-player intelligence** makes the loop *alive*: it varies, answers, accompanies and takes initiative. The musician must control how much of this happens, so it sits behind the Eigensinn knob.

---

## 2. Prior art, system by system

Each entry covers what the system does musically, how it works, its size and latency, and a verdict for Myzel (**yes**, **partly** or **no**, with the reason).

### 2.1 Interactive and reflexive systems (the core prior art)

**Continuator (François Pachet, Sony CSL, 2002/2003)**
- **Musically:** The system answers your phrase in your own style, as soon as you stop playing. It stops when you resume, so it is a duet with a mirror.
- **How:**
  - It builds variable-order Markov models on the fly from the MIDI you play, so nothing is pretrained ([JNMR 2003 abstract](https://www.francoispachet.fr/?p=4360), [pachet-02f](https://csl.sony.fr/wp-content/uploads/2002/09/pachet-02f.pdf)). It stores prefix trees of the input sequences.
  - It generates by following the longest context that matches. When nothing matches exactly, it falls back to coarser "viewpoints" such as pitch region instead of exact pitch.
  - A phrase analyser segments the input with a temporal threshold of about 250 ms. Turn-taking is simple: the system activates when the player stops and yields when the player resumes ([pachet-03g](https://www.francoispachet.fr/wp-content/uploads/2021/01/pachet-03g.pdf)).
  - Later work blends the Markov probability with a fitness function, so the output can be steered by external input ([Deep Predictive Models in Interactive Music, survey](https://arxiv.org/pdf/1801.10492)).
- **Evidence:** Children aged 3–5 playing with it showed flow-like states. The key mechanism was "repetition and variation" in the turn-taking, compared with infant–caregiver interaction ([Ferrari, Addessi & Pachet](https://www.francoispachet.fr/wp-content/uploads/2021/01/ferrari-06a.pdf), [addessi-05b](https://www.francoispachet.fr/wp-content/uploads/2021/01/addessi-05b.pdf)). These are small, descriptive studies.
- **Size and latency:** The model holds a few thousand tree nodes, and a decision takes microseconds.
- **Myzel: yes.** This is the model for "Antworten" (§5.6). It must be made beat-synchronous: tokens carry their metric position, and answers start on a grid point.

**Reflexive Looper (Pachet, Roy, Moreira, d'Inverno; CHI 2013; Marchini, Pachet & Carré, NIME 2017)**
- **Musically:** A solo guitarist plays a jazz standard. The looper records the guitarist and plays back the *other* roles in the guitarist's own sound, so the guitarist can play a duet or a trio with themselves. If you solo, it plays your bass and chords. If you comp, it plays your bass and a solo.
- **How:**
  - A supervised classifier on audio descriptors labels each bar as bass line, chords or solo.
  - Concatenative synthesis adapts recorded chunks to the chord grid ([Goldsmiths record](https://research.gold.ac.uk/id/eprint/9888)).
  - The 2017 redesign keeps the same idea for structured pop. It uses a looping agent that adapts to the musician and respects given constraints through constrained optimisation, because the original only suited jazz-guitar improvisation ([NIME 2017](https://nime.org/proc/nime2017_mmarchini/)).
- **Size and latency:** The classifier is small. Generation is a search over recorded segments.
- **Myzel: yes**, and more easily than the original: Myzel knows each note's pitch, degree, sound source and polyphony exactly, without audio analysis. The "other members" rule is the most musical single idea for a looper (§5.2). Concatenative audio adaptation is not needed, because event loops are simply re-performed in the new harmony.

**OMax (Assayag, Bloch, Chemillier, Dubnov; IRCAM, from about 2004)**
- **Musically:** It improvises from what you just played, recombining your own fragments. It sounds like you, but rearranged.
- **How:**
  - It uses a **factor oracle**, an automaton built online in linear time. Its suffix links connect positions that share a context ([Allauzen, Crochemore & Raffinot 1999](https://dx.doi.org/10.1007/3-540-47849-3_18)).
  - Generation walks forward through the oracle (continuity) or jumps along a suffix link (recombination). One probability sets the balance between "faithful" and "inventive" ([Assayag & Dubnov 2004](https://dx.doi.org/10.1007/s00500-004-0385-4), [OMax tutorials](https://forum.ircam.fr/article/omax5-tutorials/)).
  - Early OMax did not model rhythm or long-range structure ([taxonomy](https://arxiv.org/pdf/1812.04186)).
  - It was extended to audio (OMax-Ofon) and to imperfect matching (Audio Oracle, [PyOracle](https://ojs.aaai.org/index.php/AIIDE/article/download/12653/12501)).
- **Size and latency:** It is linear in the material, and a step costs microseconds.
- **Myzel: yes.** The factor oracle is a compact alternative to the Continuator's tree, and its continuity probability maps directly onto an "Eigensinn" control.

**Somax2 (Assayag, Bonnasse-Gahot; Borg, Fiorini; IRCAM 2012–2025)**
- **Musically:** Agents improvise from a chosen corpus, such as a recording or MIDI file, while listening to the live player harmonically and melodically. They react "in context" rather than in turn.
- **How:**
  - The software combines machine listening, a "cognitive memory activation" model and a multi-agent architecture ([GitHub README](https://github.com/DYCI2/Somax2), [REACH page](https://reach.ircam.fr/index.php/2024/01/27/somax2/)).
  - The corpus is cut into labelled slices. Incoming events activate matching corpus positions, and these "influence peaks" decay over time. The agent plays the slice with the strongest merged activation, with a bias toward continuity (this mechanism is from my background knowledge; the README does not describe it).
  - It is written in Max and Python under GPL-3.0. Version 2.6 added live corpus recording and native Apple Silicon ([IRCAM media](https://brahms4.ircam.fr/en/media/xe0cc49_somax-26-and-reach-co-creative-tools)).
- **Myzel: partly.** The code (Max, Python, GPL) is not usable. The *idea* is: a decaying activation over your own past material, driven by what you play now, is a cheap way to "listen while playing" instead of strict turn-taking (§5.6).

**ImproteK, then DYCI2, now Dicy2 (Jérôme Nika, Marc Chemillier, Gérard Assayag; IRCAM)**
- **Musically:** It improvises *on a scenario*, such as a chord grid on a beat. It anticipates the chords to come instead of only reacting.
- **How:**
  - The factor oracle is queried for a memory sequence whose labels match the scenario's *future* labels. Live input revises these "mid-term anticipations" ([Nika et al. 2017](https://hal.archives-ouvertes.fr/hal-01380163), [ICMC 2012](https://hal.sorbonne-universite.fr/hal-01059330v1)).
  - Dicy2 merges the "free", "reactive" and "scenario-based" paradigms in one library of agents. It is a Max package plus a Python server under GPL-3.0 ([GitHub](https://github.com/DYCI2/Dicy2)).
- **Myzel: yes, as an idea.** When Myzel knows the coming harmony (scenes, a scale change, or a future chord track), the answer generator should search for continuations that *fit the future labels*, not only the past (§5.1d, §5.5, §5.6).

**Voyager (George Lewis, 1986–1988 onward)**
- **Musically:** A non-hierarchical "virtual improvising orchestra". It analyses the human in real time, and it also has independent behaviour of its own.
- **How:** It can imitate, oppose or ignore the player's musical dynamic, and there is no built-in leader–follower hierarchy ([Lewis, LMJ "Too Many Notes"](https://www.sfu.ca/pasquier/IAT-811/Files/Students/voyager.pdf), [discussion](https://arxiv.org/pdf/1711.11319)). From my background knowledge, its ensemble configurations change every few seconds on their own schedule.
- **Myzel: yes, as a principle.** The three stances (imitate, oppose, ignore) give the high end of the Eigensinn knob its meaning (§4.2, §5.4). The system needs some will of its own to be a partner rather than an echo.

**Cypher (Robert Rowe, about 1990)**
- **Musically:** It is the classic "listener plus player" architecture.
- **How:**
  - The listener classifies MIDI input by speed, density, register, dynamics, harmony and rhythm, on several time scales ([Rowe, aesthetics paper](https://bpb-us-e1.wpmucdn.com/wp.nyu.edu/dist/8/1076/files/2020/03/The-aesthetics-of-interactive-music-systems.pdf), [Rowe site](https://wp.nyu.edu/robert_rowe/?p=130)).
  - The player maps those classifications to response methods. The user edits the relations, and a score section switches sets of relations.
  - Its design rule: "at any time one should be able to play music to the system and have it do something reasonable."
- **Myzel: yes.** The feature set (density, register, loudness, speed) is the right one for energy following and role detection (§5.2, §5.4), and the design rule is a good acceptance test.

**GenJam (Al Biles, 1994 onward)**
- **Musically:** A jazz soloist that trades fours with a human. It takes the human's last four bars, maps them onto its own representation, mutates them, and plays them back as its answer ([Biles ICMC 1998](https://genjam.org/wp-content/uploads/2019/07/bilesicmc98.pdf)).
- **How:** A genetic algorithm with "musically meaningful" mutations. Originally it was trained by a human mentor rating its phrases.
- **Myzel: yes.** "Mutate your last phrase with musically meaningful operators" is exactly the variation engine of §5.3. The human-rated fitness loop maps to the Lob/Nein buttons.

**Shimon (Guy Hoffman and Gil Weinberg, Georgia Tech, 2009 onward)**
- **Musically:** A robotic marimba player that improvises with a human. It uses *anticipatory*, beat-matched action, so it plays together with the human rather than late.
- **How:** Markov style models of jazz players. Listeners rated the duo as better synchronised and more coordinated when the robot anticipated ([Hoffman & Weinberg 2011](https://www.springerprofessional.de/en/interactive-improvisation-with-a-robotic-marimba-player/3685538), [ICML 2011](https://icml.cc/imls/conferences/2011/papers/X4_crossconference.pdf), [Robohub](https://robohub.org/robotic-musicianship)).
- **Myzel: yes, as a principle.** A looper must never try to react to a note *within* that note. It reacts on the grid, a beat or a bar later, and plans ahead.

**Living Looper (Victor Shepardson and Thor Magnusson, Intelligent Instruments Lab; NIME 2023 and NIME 2025)**
- **Musically:** A looper pedal whose channels do not repeat. They *continue* the incoming audio by neural synthesis and learn from one another, which produces shifting agency between the player and the "living loops" ([NIME 2023](https://nime.org/proc/nime2023_32/), [PDF](https://iil.is/pdf/2023_nime_shepardson_magnusson_living_looper.pdf)).
- **How:** The 2025 version adds a GUI and online learning with partial least squares regression on top of pretrained neural models ([NIME 2025](https://nime.org/proc/nime2025_36/)). From my background knowledge, it builds on RAVE-style latent models (not confirmed by the abstracts).
- **Size and latency:** It runs on desktop with a neural audio codec.
- **Myzel: no as built (neural audio, desktop), yes as a concept.** "A loop that is a process, not a recording" is the artistic core of the owner's wish. Myzel can realise it *symbolically*, through the variation engine and physical models that never sound the same twice, while keeping its own sound.

**Spire Muse (Notto Thelle and Philippe Pasquier, NIME 2021, best paper)**
- **Musically:** A virtual partner that moves along an **autonomy axis from reactive to proactive**: shadowing, then mirroring, then coupling. Negotiation emerges from the interface.
- **How:** Feedback buttons let the player approve a behaviour, force a return to an earlier behaviour, or request a change ([NIME 2021](https://nime.org/proc/nime2021_38/), [code](https://github.com/sirnotto/SpireMuse)). Only preliminary user observations were published.
- **Myzel: yes.** It is the closest published model for the Eigensinn knob and the Lob, Zurück and Anders controls (§4.2).

**ReaLchords and ReaLJam (Google DeepMind with Mila and UMass; ICML 2024 and CHI EA 2025)**
- **Musically:** Online chord accompaniment for a live melody. The RL-tuned model *recovers from mistakes and transpositions*, while likelihood-only models do not ([ReaLchords](https://proceedings.mlr.press/v235/wu24c.html), [arXiv](https://arxiv.org/html/2506.14723v1)).
- **How:**
  - ReaLJam adds a protocol for live jamming. The agent continuously predicts what comes next and **shows its plan on screen**, so the human can anticipate it ([ReaLJam](https://arxiv.org/abs/2502.21267)).
  - Experienced musicians rated it highly for enjoyment and musical interest. The authors ask for more user control, such as genre and *output sparsity*.
- **Size and latency:** Transformers run on a server or GPU. The parameter count was not in the sources I could read.
- **Myzel: no** for the model, which needs a server. **Yes** for the two lessons: anticipation plus visible plans, and sparsity control.

**jam_bot and "Agents in Concert" (MIT Media Lab; ISMIR 2025, IUI 2026)**
- **Musically:** Two months of co-design with jazz musicians, ending in a concert with agents built on VampNet, Somax2 and the jam_bot.
- **Findings:**
  - Musicians tended to *rein in* the wild qualities of the generative systems.
  - Useful interventions were a guitar pedal to fit the system into loop-based practice, and a **visual forecast of the AI's upcoming predictions** ([Agents in Concert](https://www.media.mit.edu/publications/agents-in-concert/), [jam_bot](https://news.mit.edu/2024/model-virtuosity-jordan-rudess-jam-bot-1119)).
- **Myzel:** These are design lessons, not code (§4).

**Notochord (Victor Shepardson et al., Intelligent Instruments Lab, AIMC 2022)**
- **Musically:** A probabilistic real-time MIDI model trained on Lakh MIDI. Interventions at the sub-event level (pitch, time, velocity, instrument) allow steerable generation, harmonisation and improvisation ([arXiv 2403.12000](https://arxiv.org/abs/2403.12000)).
- **How:** An RNN under MIT license ([GitHub](https://github.com/Intelligent-Instruments-Lab/notochord)).
- **Size and latency:** The reported latency is **below 10 ms** per event on a CPU. The parameter count was not stated on the README. From my background knowledge, the default model is millions of parameters (GRU, hidden size in the thousands), which is too big to inline.
- **Myzel: partly.** The architecture idea is a small autoregressive RNN over (instrument, pitch, time, velocity) whose distributions can be constrained at sampling time, for example "only scale tones" or "only on the beat". A model of 0.1–0.3 M parameters retrained for Myzel would fit (§3.5, §5.8). The published checkpoint does not.

**Anticipatory Music Transformer (John Thickstun et al., TMLR 2024)**
- **Musically:** Infilling and accompaniment conditioned on given notes. In a 20-second accompaniment test, listeners rated its musicality as comparable to human-composed music ([arXiv](https://arxiv.org/abs/2306.08620), [CRFM](https://crfm.stanford.edu/2023/06/16/anticipatory-music-transformer.html)).
- **Size:** A GPT-2-scale model (hundreds of millions of parameters, from my background knowledge).
- **Myzel: no.** It is too big and not real-time on a phone.

### 2.2 Magenta and Google

**AI Duet (Yotam Mann, Google Creative Lab, 2016/2017)**
- **Musically:** It answers piano phrases with a continuation, in the spirit of the Continuator but neural.
- **How:** The browser sends short MIDI clips to a **Python Flask server** running Magenta and TensorFlow. The repository is archived ([GitHub](https://github.com/googlecreativelab/aiexperiments-ai-duet), [experiment page](https://experiments.withgoogle.com/ai-duet)).
- **Myzel: no** as built, because it needs a server. The musical function is covered on-device by §5.6.

**MusicVAE and GrooVAE: humanize, drumify, tap2drum, interpolation (Magenta 2018/2019)**
- **Musically:**
  - Humanize adds learned drummer timing and velocity to a quantised pattern.
  - Drumify and Tap2Drum turn a rhythm or a tapped pattern into a drum groove.
  - MusicVAE interpolates between two loops through a latent space ([GrooVAE](https://magenta.tensorflow.org/groovae), [paper](https://arxiv.org/abs/1905.06118)).
- **How:** VAE or VIB models with recurrent encoders and decoders. They are trained on the Groove MIDI Dataset: 13.6 h of drumming by professionals, with micro-timing.
- **Size:** The magenta.js checkpoints are **15.6–15.8 MB** for groovae_2bar_humanize and tap2drum, 17.6–18.5 MB for the small 2-bar MusicVAEs, and 65–97 MB for the 4-bar and multitrack models ([checkpoint list](https://github.com/magenta/magenta-js/tree/master/music/checkpoints)). Base64 inflation makes 15.8 MB into about 21 MB inside an HTML file.
- **Status:** Magenta's Python repository was **archived on 6 January 2026** ([repo](https://github.com/magenta/magenta/tree/main/magenta/models/piano_genie)). magenta.js still lists only MusicVAE, MelodyRNN, DrumsRNN, PerformanceRNN, ImprovRNN, SketchRNN and style transfer on its front page and has old CI ([magenta-js](https://github.com/magenta/magenta-js)).
- **Myzel: no** for the published checkpoints, which are about 15 times the whole app. **Partly** for the function: groove templates and rule-based drum mapping cover most of humanize and drumify (§5.1e, §5.5d). Interpolating between two loops can be done symbolically, by morphing pitch-degree and onset sequences with a common grid.

**Piano Genie (Chris Donahue, Ian Simon, Sander Dieleman; IUI 2019)**
- **Musically:** Eight buttons play an 88-key piano. Your *contour* chooses, and the model picks plausible pitches.
- **How:** A bidirectional LSTM encoder and a unidirectional LSTM decoder with an integer-quantised bottleneck. **Only the decoder runs at play time**, once per button press ([arXiv](https://arxiv.org/abs/1810.05246), [Google Research](https://research.google/pubs/piano-genie/)).
- **Size:** A small LSTM. Hundreds of thousands of parameters is my estimate; the sources I could read gave no figure.
- **Myzel: partly.** Myzel's scale field already solves "few gestures, right notes" by construction. The interesting transfer is *contour-to-pitch* for variations: keep the up/down shape of a phrase and re-choose degrees (§5.3), which needs no network.

**DDSP and Tone Transfer (Magenta 2020/2021)**
- **Musically:** Re-renders sung or played audio as a flute, saxophone, trumpet or violin.
- **How:**
  - DDSP in TensorFlow.js, with SPICE for pitch ([Tone Transfer](https://magenta.tensorflow.org/tone-transfer), [paper](https://research.google/pubs/tone-transfer-in-browser-interactive-neural-audio-synthesis/)).
  - Each magenta.js DDSP model is **3.9 MB** ([checkpoints](https://github.com/magenta/magenta-js/tree/master/music/checkpoints)).
  - Google's Sounds of India project ran a TF.js DDSP model on mobile. It had to be very efficient, and any quality loss quickly became audible distortion ([TF blog](https://blog.tensorflow.org/2020/08/creating-sounds-of-india-with-tensorflow.html)).
- **Myzel: no.** It brings a fixed, less controllable timbre into an instrument whose point is 28 hand-built physical models. It also adds 4 MB per instrument plus TF.js, and it is offline, not interactive.

**Magenta RealTime (v1, June 2025)**
- **Musically:** A live, steerable *audio* music generator. Text or audio prompts are mixed in a style space.
- **How:** About 800 M parameters generating 2-second chunks. It produces 2 s of audio in about 1.25 s on a free Colab TPU, a real-time factor of about 1.6 ([MarkTechPost](https://www.marktechpost.com/2025/06/22/google-researchers-release-magenta-realtime-an-open-weight-model-for-real-time-ai-music-generation/), [Live Music Models paper](https://arxiv.org/abs/2508.04651)). Control latency is seconds.
- **Myzel: no.** It needs a TPU or GPU.

**Magenta RealTime 2 (MRT2, 4 June 2026)**
- **How:**
  - Two models: mrt2_small (230 M parameters) and mrt2_base (2.4 B). Steering is by MIDI, audio and text, with about 200 ms control latency reported ([README](https://github.com/magenta/magenta-realtime), [Google AI Devs post](https://x.com/googleaidevs/status/2062603374789263646), [Mervin Praison write-up](https://mer.vin/2026/06/magenta-realtime-2-open-local-live-music-model-with-midi-and-200ms-latency/), [GIGAZINE](https://gigazine.net/gsc_news/en/20260605-magenta-realtime-2-live-music-ai/)).
  - Real-time streaming needs **Apple Silicon M-series Macs**, through a C++ MLX engine. The base model needs Pro or Max chips. NVIDIA GPUs run it offline only. The README mentions no phones and no browsers.
  - The 40 ms frame size is from secondary coverage *(unverified)*.
- **Myzel: no.** 230 M int8 parameters alone are about 230 MB, and no browser path to MLX or Metal exists (WebGPU is the only GPU API). The answer to "feasible on a phone?" is: not in 2026.

**Lyria RealTime (Gemini API, experimental) and Lyria 3.5 (September 2026)**
- **How:**
  - Lyria RealTime streams instrumental audio over a persistent WebSocket, steered by weighted prompts, BPM, density, brightness and guidance. The model ID is `lyria-realtime-exp` ([docs](https://ai.google.dev/gemini-api/docs/realtime-music-generation)).
  - It needs a network connection and an API key. A static page would have to expose the key or use the user's own.
  - Lyria 3.5 generates songs and clips, not a live stream ([report](https://pasqualepillitteri.it/en/news/14486/lyria-3-5-gemini-app-api-en)).
- **Myzel: no** for the offline core. At most it could be an **optional online extra**, but it would bring a foreign timbre and seconds of latency. It is not recommended.

### 2.3 Commercial tools

- **Flow Machines (Sony CSL).** It generated eight-bar melodies, chords and basslines over a chosen progression, as an inspiration tool. The mobile app was cloud-based. Sony CSL transferred the research to **Roland**, and FM Mobile was scheduled to end on 18 March 2026 ([Sony CSL](https://www.sonycsl.co.jp/?p=25750), [RouteNote](https://routenote.com/blog/flow-machines-mobile-sony/)).
  - **Myzel: no.** It is a server product and is ending.
- **BandLab.** The confirmed AI features are production tools (mastering, voice-to-MIDI). An "AI Band" accompaniment appears only in secondary sources ([overview](https://music.loop.fans/ai/bandlab-ai)), so I found no verified real-time AI jam feature.
  - BandLab's own **Harmonica** transcription paper (September 2026) is relevant. Its *nano* model has **26.3 k parameters**, reportedly 14.6 points better frame F1 than Basic Pitch, and is used in BandLab Studio's audio-to-MIDI ([arXiv 2609.04640](https://arxiv.org/abs/2609.04640)).
  - I found no public weights *(unverified)*.
- **Ableton:**
  - Live 12's MIDI Generators and Transformations are rule- and constraint-based, not ML ([Live 12](https://ableton.com/en/live/all-new-features)).
  - **Capture MIDI** is the relevant precedent. Live always listens. In an empty set it detects the tempo of what you just played, sets loop boundaries and places the notes on the grid, with tempo detection in roughly the 80–160 BPM range ([Ableton help](https://help.ableton.com/hc/en-us/articles/360000776450-Capture-MIDI), [Garnish](https://www.garnishmusicproduction.com/?p=17733)).
  - Live 12.3 added on-device stem separation, licensed from the Moises team ([Mixdown](https://mixdownmag.com.au/news/ableton-live-12-3-drops-overnight-with-stem-separation-and-splice-integration/)).
  - Magenta Studio was the Max for Live AI set: Continue, Generate, Interpolate, Groove, Drumify ([announcement](https://magenta.tensorflow.org/studio-announce)).
  - **Myzel: yes** for the Capture idea, which Myzel already has in spirit as the retroactive Fährte (§5.1).
- **Looper prior art for "free first loop sets the tempo".** Echoplex and Mobius derive tempo and bar count from the first loop's length. Reaper's own detector returns implausible tempos such as 16 BPM ([Playtime feature request](https://bitbucket.org/helgoboss/playtime/issue/67)). Vibe Looper has a "Detect" mode ([MWM](https://mwm.ai/de/apps/vibe-looper/6758245125)). Patents describe storing a phrase and repeating it in sync with tempo information derived from the source, and refining the tempo and bar count from the loop length with the spacing of level peaks ([patent 1](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7259316), [patent 2](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5973255); I could not tell from the search summary which patent says which).
  - **Myzel: yes** (§5.1).

### 2.4 Neural audio (timbre transfer, neural DSP)

**RAVE, nn~ and Neutone (IRCAM ACIDS; Qosmo)**
- **Musically:** Real-time timbre transfer and latent-space manipulation. Any input becomes "violin-ish", "drum-ish" and so on.
- **How:**
  - A multi-band VAE. It is about 20 times faster than real time at 48 kHz on a laptop CPU ([RAVE paper](https://arxiv.org/abs/2111.05011)).
  - It is used through `nn~` in Max or Pd, a VST, or Neutone ([RAVE README](https://github.com/acids-ircam/RAVE), [Neutone](https://qosmo.jp/en/news/neutone)).
  - There is a "raspberry" configuration that runs in real time on a Raspberry Pi 4 (native, 4 cores) and an "onnx" configuration.
- **Latency:** Standard RAVE latency is high. One project measured 563 ms for RAVE against about 10 ms for BRAVE ([CCRMA project](https://ccrma.stanford.edu/~nshaheed/220c_sp25/)).
- **BRAVE (Caspe, McPherson et al., JAES 2025):** It redesigns RAVE for under 10 ms latency with about 3 ms jitter. It cites 10 ms ±1 ms as the target for musical interaction, and notes that 20 ms, or 10 ±3 ms, degraded performance ([arXiv 2503.11562](https://arxiv.org/abs/2503.11562), [NIME 2025](https://nime.org/proc/nime2025_10/)).
- **Browser:** I found no browser port of RAVE.
- **Myzel: no.**
  - A single-threaded WASM model on a mid-range phone would share one core with Myzel's own worklet DSP, so real time is not dependable *(estimate)*.
  - The ONNX or WASM runtime alone is 10+ MB.
  - The timbre would be trained on someone else's sound. That works against an instrument built on its own physical models.

**NAM Web Player (TONE3000).** Neural amp modelling in the browser, with the desktop NAM engine compiled to WASM inside an AudioWorkletProcessor. It needs SharedArrayBuffer, so the page must be cross-origin isolated, and it "requires a modern processor" ([TONE3000](https://www.tone3000.com/blog/introducing-the-nam-web-player)).
- **Myzel:** This is useful evidence that WASM neural DSP in a worklet works on capable devices with cross-origin isolation. It is also evidence that it is device-dependent.

**Stable Audio Open Small (Stability AI and Arm, May 2025).** 341 M parameters. It generates about 11 s of stereo audio in about 7–8 s *natively* on an Arm phone CPU (vendor claim, [Stability AI](https://stability.ai/news/stability-ai-and-arm-release-stable-audio-open-small-enabling-real-world-deployment-for-on-device-audio-control)).
- **Myzel: no.** It is not interactive, not in a browser, and hundreds of MB.

### 2.5 Analysis (MIR) building blocks

**Spotify Basic Pitch (ICASSP 2022)**
- **What:** Polyphonic, instrument-agnostic audio-to-MIDI with onsets, notes and pitch bends.
- **How:**
  - A tiny CNN. Model cards cite about 17 k or 35.7 k parameters ([Core ML card](https://huggingface.co/schism-audio/basic-pitch-coreml), [GGUF card](https://huggingface.co/cstr/basic-pitch-GGUF)). The ONNX file is about 230 KB.
  - The TypeScript version is Apache-2.0 and runs on TF.js. It is file- or window-based, not a live stream ([basic-pitch-ts](https://github.com/spotify/basic-pitch-ts), [Spotify blog](https://engineering.atspotify.com/meet-basic-pitch/)).
- **Myzel: partly.** The *model* is small enough to port to hand-written JS kernels (a few hundred lines) without TF.js. That would turn an audio loop (mic, external instrument) into notes a few seconds after recording, so all the event intelligence can apply. It is not needed for Myzel's own notes. Harmonica-nano (26.3 k parameters, above) would be the better choice if its weights become available.

**Essentia.js (MTG)**
- **What:** Essentia's C++ compiled to WASM, covering key, beat, BPM, onsets and more, plus TF.js model wrappers. AGPL-3.0, with no backwards-compatibility guarantee ([GitHub](https://github.com/MTG/essentia.js)).
- **Size:** One app reports about 2 MB of WASM ([dev.to](https://dev.to/tagmybeat/i-built-a-free-music-tool-i4l)) *(unverified)*.
- **Myzel: no.** The license and the size are both obstacles. The few algorithms needed (spectral flux onsets, key profiles, autocorrelation) are 50–200 lines each to write directly.

**Pitch: CREPE, SPICE and PESTO**
- **CREPE:** Accurate, but the full model is large and slow. The tiny variant is about 10 times faster ([CREPE](https://github.com/marl/crepe)).
- **SPICE:** Self-supervised, used in Tone Transfer.
- **PESTO (Sony CSL, ISMIR 2023 and TISMIR 2025):**
  - 130 k parameters, with under 10 ms latency (under 5 ms in the arXiv version).
  - A streaming mode, ONNX export, and about 0.7 ms per ONNX inference on a laptop CPU. LGPL-3.0 ([GitHub](https://github.com/SonyCSLParis/pesto), [arXiv 2508.01488](https://arxiv.org/abs/2508.01488)).
- **Myzel:** PESTO is **partly** feasible, for live monophonic voice or instrument input, as a hand-ported model in a Worker. For Myzel's own notes pitch is known, so no detector is needed. For a cheap mic path, YIN or MPM in a few dozen lines is enough.

**BeatNet (Heydari, Cwitkowitz and Duan; ISMIR 2021)**
- **What:** A causal CRNN plus two particle filters for online beat, downbeat, tempo *and meter*. An information gate makes the particle filtering cheaper ([arXiv](https://arxiv.org/abs/2108.03576)).
- **How:** Python and PyTorch with madmom, under CC-BY-4.0 ([GitHub](https://github.com/mjhydri/BeatNet)).
- **Myzel: partly.** It is only needed if the looper must follow *external audio* without MIDI clock. Myzel's own events need no beat tracker, because Myzel knows when each note started.

**madmom (Böck et al. 2016)**
- **What:** The reference Python MIR library (onsets, beats, downbeats, tempo, chords). Its DBN beat tracker can run on live audio ([paper](https://arxiv.org/abs/1605.07008)).
- **Myzel: no** as code (Python). Its algorithms are the reference designs.

**Onset detection: spectral flux and SuperFlux**
- **What:** SuperFlux (Böck & Widmer, DAFx 2013) is spectral flux with a frequency max-filter. It cuts vibrato false positives by up to 60% and is causal, so it suits real-time use. It works best on a filterbank of about 24 bands per octave ([DAFx](https://dafx.de/paper-archive/details/0oee-99Z88WL7pSo749gcA), [madmom docs](https://madmom.readthedocs.io/en/v0.16/modules/features/onsets.html)).
- **Myzel: yes**, for audio loops and mic input. Its cost is one FFT per hop, which is negligible.

---

## 3. Feasibility in the browser on phones (October 2026)

### 3.1 Runtimes and what they cost a single-file app

| Runtime | Size | Threads | Notes |
|---|---|---|---|
| **ONNX Runtime Web (WASM)** | `ort-wasm-simd-threaded.wasm` is **about 11–12 MB** ([commit note](https://app.semanticdiff.com/gh/microsoft/onnxruntime/commit/e6ae1bb13c9ec5ee1ef3f0428c46ef8607728848), [manifest](https://huggingface.co/janitr/experiments/blob/main/runtime/onnxruntime-web/RUNTIME_INFO.json)). The JSEP/WebGPU builds are larger ([deploy docs](https://onnxruntime.ai/docs/tutorials/web/deploy.html)). | Multi-threading only if `crossOriginIsolated`. Otherwise it **silently falls back to 1 thread** ([env flags](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)). SIMD is required. | Inlined as base64 it would be about 15 MB, ten times the app. Custom operator-reduced builds are possible but still several MB. |
| **TensorFlow.js** | Several hundred KB to several MB depending on backends. A community build reports 2.5 MB for all backends, unminified ([vladmandic/tfjs](https://github.com/vladmandic/tfjs)). Kernel-pruned custom bundles are possible ([TF guide](https://www.tensorflow.org/js/tutorials/deployment/size_optimized_bundles)). | WASM backend threads need isolation. | Magenta.js and Basic Pitch run on it. |
| **LiteRT.js (Google, 2025/2026)** | Not stated. It is LiteRT's C++ compiled to WASM with XNNPACK, plus WebGPU ([docs](https://developers.google.com/edge/litert/web), [blog](https://developers.googleblog.com/en/litertjs-googles-high-performance-web-ai-inference/)). | The same constraints apply. | Positioned as the successor to TF.js for `.tflite` models. |
| **WebNN** | A browser API, so no download. | | Only an origin trial in Chrome 145–147 ([Phoronix](https://www.phoronix.com/news/Chrome-146-Beta), [intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/5CWKSChYo98)). Not usable in production. |
| **Hand-written JS or tiny WASM kernels** | **0** for the runtime, plus about 5–20 KB of code. | Not needed. | **The realistic route for models under about 0.5 M parameters.** Weights stored as int8 in base64 cost 1.33 bytes per parameter. |

**Practical consequence.** Any neural model Myzel ships should be small enough to run in a few hundred lines of plain JavaScript, using Float32Array matrix-vector products, on the main thread or in a Blob-URL Worker. Myzel already avoids external libraries ("External libraries are not used", code-map §9).

### 3.2 Cross-origin isolation (threads and SharedArrayBuffer)

- **GitHub Pages cannot set COOP/COEP headers.** The workaround [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) registers a service worker that adds the headers, then reloads once.
  - It must be a separate same-origin file, which is fine for the PWA but not for a bare single HTML file.
  - It retries with `require-corp` when `credentialless` fails. Safari never supported `credentialless` (MDN BCD: COEP `credentialless` is Chrome 96, Firefox 119, Safari not supported, [BCD](https://github.com/mdn/browser-compat-data/blob/main/http/headers/Cross-Origin-Embedder-Policy.json)). PRs adding Safari support and the `require-corp` fallback were merged in 2023 ([PR list](https://github.com/gzuidhof/coi-serviceworker/issues?q=safari)).
  - SharedArrayBuffer requires isolation: Safari and iOS from 15.2, Chrome Android from 89 ([BCD](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/SharedArrayBuffer.json)).
- **Myzel already has a service worker** (`myzel/pwa/sw.js`, cache-first). It could add COOP and COEP `require-corp` to its responses, since every asset is same-origin. Isolation would still be missing in four cases:
  - the very first visit, before the worker controls the page;
  - a file opened from disk (`file://` has no service workers);
  - the claude.ai view;
  - any embedded cross-origin resource.
- **Verdict:** none of the recommended intelligence needs threads. Do not make the looper depend on isolation. If a later neural extra needs threads, isolation via `sw.js` is possible for the installed PWA only, and must be tested on iOS.

### 3.3 WebGPU

- **Support:** Chrome Android 121+ only on Android 12+ with Qualcomm or ARM GPUs ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)). Safari and iOS 26+ by default. Firefox Android: none. Samsung Internet 121+ ([BCD GPU](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json)).
- **Gaps:** Many mid-range Android phones, older iPhones on iOS < 26, and Firefox Android have no WebGPU.
- **Audio suitability:** GPU dispatch and readback add milliseconds and scheduling jitter, so WebGPU is unsuitable for anything on the audio path. It is fine for *background* generation of a next loop cycle, but nothing recommended here needs it.

### 3.4 AudioWorklet and WASM

- **Support:** AudioWorklet exists everywhere Myzel runs: Safari 14.1+, Chrome 66+, Firefox 76+ ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/AudioWorklet.json)). WASM SIMD is supported from Safari 16.4 and is universal elsewhere ([Nutrient](https://www.nutrient.io/guides/web/troubleshooting/webassembly-simd-support/)). Emscripten's Wasm Audio Worklets API supports C/C++ processors ([docs](https://emscripten.org/docs/api_reference/wasm_audio_worklets.html)). RTNeural is the reference library for real-time-safe small networks ([RTNeural](https://ccrma.stanford.edu/~jatin/rtneural)).
- **Myzel's situation:** The audio thread is already the scarcest resource: 28 physical-model sources with measured VCOST, and `VBUDGET` 14 units on mobile at level 1. The looper's intelligence must therefore stay **off the audio thread**. The worklet does only what must be sample-exact: recording, playback, the seam crossfade and, for audio loops, an onset envelope.

### 3.5 Latency budget: where intelligence may be slow and where it may not

A looper has a built-in advantage: **it knows the future one cycle ahead.** Most intelligent work can happen *during the current pass* for the next one. The time budget is the loop length, which is seconds.

| Kind of decision | Budget | Method |
|---|---|---|
| Your own notes | **0** (never touched) | The looper never delays or quantises the live sound. |
| Loop close, bar inference, analysis of a finished take | 50–200 ms is acceptable, because the result is applied at the next bar line | Main thread or Worker, once per take |
| Variation for the next pass | Up to one pass | Generate candidates in the background and schedule with look-ahead on the AudioContext clock (as Puls `seqTick` does) |
| Reactive answer, energy following, role switch | Up to the next beat or bar boundary (≥ 100 ms) | Decide on the grid, never "on the note" (the Shimon principle) |
| Anything that must sound within 10 ms of a touch (BRAVE's ±1 ms jitter target) | Impossible for a model on the main thread | Not attempted |

**Cost of a small RNN *(estimate)*.** A GRU with hidden size 256 and a 64-dimensional input, plus an output layer for about 130 tokens, has roughly 0.28 M parameters, so one step is about 0.56 MFLOP. Plain JavaScript on a mid-range phone manages roughly 0.5–2 GFLOP/s, so a step takes 0.3–1 ms. A 16-note phrase with beam width 8 takes about 40–130 ms, which is comfortably inside a one-bar budget. Stored as int8 the weights are about 0.28 MB, or 0.37 MB in base64, which adds about 27% to the file. **A model of this size is feasible. A 15 MB GrooVAE checkpoint or a 230 M-parameter MRT2 is not.**

### 3.6 Verdict table

| System | Symbolic or audio | Feasible in Myzel (offline, phone, single file)? |
|---|---|---|
| Continuator, factor oracle (OMax), Dicy2 scenario search, GenJam mutations, Cypher features, Voyager stances, Reflexive Looper roles | symbolic | **Yes**, as hand-written algorithms (KB of code, µs to ms) |
| Somax-style activation memory | symbolic | **Yes** (the idea; the GPL Max/Python code is not usable) |
| Piano Genie-, Notochord-sized small RNN prior | symbolic | **Partly**: only retrained at about 0.1–0.3 M parameters with hand-written inference; published checkpoints are too large |
| GrooVAE / MusicVAE (magenta.js) | symbolic | **No** (15.6–97 MB checkpoints plus TF.js); the function is replaced by groove templates |
| ReaLchords, ReaLJam, AMT, jam_bot | symbolic | **No** (server or GPU transformers) |
| Basic Pitch, Harmonica-nano | audio to symbolic | **Partly**: the model is tiny, the runtime is the problem; port by hand; offline after recording |
| PESTO, YIN/MPM pitch | audio analysis | **Partly / yes** (only for mic input) |
| Spectral flux / SuperFlux onsets, autocorrelation tempo | audio analysis | **Yes** |
| BeatNet, madmom | audio analysis | **Partly**: only if external audio must be followed; the CRNN would need porting |
| Essentia.js | audio analysis | **No** (AGPL, about 2 MB WASM; the needed parts are easy to write) |
| RAVE, BRAVE, Neutone, DDSP Tone Transfer | audio generation | **No** (CPU budget, runtime size, foreign timbre) |
| Magenta RT v1, MRT2, Lyria RealTime, Stable Audio Open Small | audio generation | **No** (TPU/GPU, Apple Silicon, server API or native app); Lyria would at most be an online extra, and is not recommended |

---

## 4. Musical value and pitfalls

### 4.1 What musicians report about AI co-players

- **They want to tame it.** In two months of co-design with jazz musicians, the musicians reined in the generative systems' wildest qualities ([Agents in Concert](https://www.media.mit.edu/publications/agents-in-concert/)). A looper's default must be modest.
- **Anticipation and a visible plan build trust.**
  - Showing the agent's plan on screen was central to ReaLJam's real-time jamming ([ReaLJam](https://arxiv.org/abs/2502.21267)).
  - Forecasting the AI's upcoming predictions was one of the key interventions in Agents in Concert.
  - In McCormack et al.'s CHI 2019 study, showing an AI drummer's internal state (its confidence, as emoticons) correlated with musicians' flow and engagement on the FSS-2 questionnaire ([In a Silent Way](https://arxiv.org/abs/1902.06442)).
- **Too much at once overwhelms; control creates ownership.** In Cococo (CHI 2020), novices struggled when the model generated too much content at once. Steering tools (restrict to one voice, nudge in semantic directions) increased control, creative ownership and the sense of collaboration ([Magenta](https://magenta.tensorflow.org/people-first-hci-ml-collaborations)).
  - Consequence: one layer at a time, and changes in small, audible steps.
- **Agency is attributed easily.** Expert improvisers were prepared to attribute agency to a system with *minimal* state ([Linson, Dobbyn, Lewis & Laney, CMJ 2015](https://dspace.stir.ac.uk/bitstream/1893/31414/1/Linson-etal-CMJ-2015.pdf)).
  - Whether the system feels like a "tool" or an "actor" correlates with the performer's own sense of agency ([Erdem et al., CAVI](https://sonicfield.org/library/tool-or-actor-expert-improvisers-evaluation-of-a-musical-ai-toddler)). A NIME 2026 phenomenological study looks at how creative control is distributed between musicians and AI-augmented instruments ([NIME 2026](https://nime.org/web_archive/2026/proceedings/432.html)).
  - Consequence: well-chosen simple rules can feel alive. A big model is not a prerequisite for "listening".
- **Lowered expectations are double-edged.** In a Wizard-of-Oz study, musicians who believed they were jamming with an "AI" expected less musicality and felt freer from judgement ([Thelle & Fiebrink 2022](https://neurips.cc/virtual/2022/63192)). This helps experimentation but also means a mediocre system is forgiven at first and abandoned later.
- **The mirror is engaging but needs variation.** Reflexive interaction (hearing yourself, transformed) produced flow-like states in children. The mechanism was repetition plus variation ([Continuator children studies](https://www.francoispachet.fr/wp-content/uploads/2021/01/ferrari-06a.pdf)).
- **Independence is what makes a partner.** Voyager's ability to imitate, oppose or ignore, and its own internal behaviour, are why it is heard as a co-improviser rather than an effect ([Lewis](https://www.sfu.ca/pasquier/IAT-811/Files/Students/voyager.pdf)).
- **Fragmented field, few evaluations.** Interactive improvisation systems are usually built for one improviser and one style, and are rarely evaluated systematically ([Gifford et al. 2018](https://research.gold.ac.uk/22943/1/ComputationalSystemsImprovisation_PrePrint.pdf)).

### 4.2 Giving the player control

**One main knob, "Eigensinn" (0–100%), per loop or global.** It moves along Spire Muse's reactive-to-proactive axis and ends with Voyager's stances:

| Eigensinn | Name (UI) | What the looper may do |
|---|---|---|
| 0 | **Treu** | Exact repetition, with service intelligence only. The audio print is used if one exists. |
| 1–25% | **Atmen** | Micro-life: timing and velocity drawn from *your* groove template with long-range-correlated noise, plus the natural variance of the physical models. No note changes. |
| 25–50% | **Variieren** | Weak-position notes may vary (neighbour degrees, ornaments, thinning or filling), with strong beats and contour kept. Most passes are still identical. |
| 50–75% | **Antworten** | Call and response from your material, role-based arrangement (it brings in the parts you are not playing), and energy following ("make space"). |
| 75–100% | **Eigenwillig** | Oracle recombination across the session, longer drifts away from the anchor, and Voyager's "oppose" and "ignore" stances. Elastic return to the anchor remains. |

**Around the knob:**
- **Anker.** Every loop keeps its original as the anchor. Variations are pulled back toward it elastically. "Zurück" restores it instantly.
- **Lob / Nein.** One tap keeps the current variant as the new anchor. Another discards it and avoids that transformation for a while. These are Spire Muse's approval and reversion buttons and GenJam's mentor feedback in one gesture.
- **Gedächtnis (memory scope)**, choosing which material the answers and recombinations may use:
  - this loop only;
  - this session;
  - a saved personal style ("Handschrift"), which is just the stored event corpus.
- **Stil-Anker.** By default the corpus is *only your own material*, so the output can only sound like you. Foreign styles, such as small Markov tables built from public-domain melodies, would be an explicit, separate option.
- **Vorschau ("Zeigen").** Ghost notes on the loop display show what will change in the next pass, one bar ahead. A tap on a ghost vetoes that change.
- **Determinism.** A seeded random number generator per loop means the same seed and the same input give the same variation. This makes variations reproducible, saveable in scenes and testable.

### 4.3 Avoiding gimmicks, latency and loss of trust

- **The test for every feature:** would an excellent human looper player or band member do this, here? If not, it is a gimmick.
- **Never wrong in a way that breaks the music.**
  - Every generated note is in the current scale, unless the player played that chromaticism.
  - Strong-beat notes of an anchor are kept unless Eigensinn > 75%.
  - The groove template is always applied.
- **Never late.**
  - The looper never sits in the path of the live sound.
  - Reactions are scheduled on beat or bar boundaries with look-ahead, never fired immediately from `onDown`.
  - The audio clock is the only time base (`A.ctx.currentTime`, frame-exact bar windows); `setTimeout` is never the time base.
- **Never surprising in the wrong way.**
  - Role and energy switches have hysteresis (at least one bar, and only on bar lines).
  - The knob and the forecast tell the player what to expect.
  - "Zurück" and "Stille" always work.
- **Starting dumb is honest.** With 8 notes of material the answer engine can only copy or babble. It should stay silent until it has enough material, roughly 30–60 events *(estimate)*, rather than fake competence.

### 4.4 Evaluation methods

**Objective tests**, deterministic with seeded RNG, in `dev/tests`:
- **Bar and tempo inference.** Use a corpus of 40+ free-played takes recorded by the owner, with ground-truth bars and BPM. Measure the share inferred correctly and the share with the correct reading among the top 3. Octave (double or half tempo) errors are the typical failure ([Dixon 2001](https://courses.cs.washington.edu/courses/cse590m/08wi/Dixon%20-%20Automatic%20Extraction%20of%20Tempo%20and%20Beat%20from%20Expressive%20Performances.pdf)).
- **Loop-close accuracy.** Measure the error in ms of the proposed loop point against the hand-labelled one.
- **Groove preservation.** Measure the correlation of micro-timing offsets before and after quantising at a given strength. A pass with strength 0 must equal the input exactly.
- **Scale conformity.** 100% of generated notes must be in scale. Measure voice-leading cost for accompaniment.
- **Variation metrics.**
  - Novelty against consistency: degree-sequence edit distance, onset-pattern distance (for example Hamming or swap distance on the grid), and pitch-class histogram distance to the anchor.
  - These should lie in a target band for each Eigensinn level.
  - Plagiarism measure: the longest verbatim copy from the corpus, as in MaxOrder ([Papadopoulos, Roy & Pachet, AAAI 2014](https://ojs.aaai.org/index.php/AAAI/article/view/9126)).
- **Cost.**
  - Analysis time per take on a mid-range Android phone (target under 20 ms).
  - No audio dropouts with the looper running.
  - Voice budget used per layer.

**Subjective evaluation:**
- **Owner listening sessions** are the binding test under the project's sound-quality rule. Use A/B comparisons of Eigensinn settings and of rule variants, blind where possible.
- **Wizard-of-Oz first** for co-player features. The owner jams while a second person (or a script with hand-chosen transformations) plays the looper's part. This tests whether a behaviour is musically wanted before it is built ([Thelle & Fiebrink](https://neurips.cc/virtual/2022/63192)).
- **Jam sessions with other musicians**, with think-aloud and a short interview afterwards. Questions: Did it listen? Could you predict it? Did you feel in control? Was it boring?
- **Questionnaires:** FSS-2 for flow (as in [McCormack et al.](https://arxiv.org/abs/1902.06442)), the Creativity Support Index, and one sense-of-agency item.
- **Longitudinal use** over a few weeks. Gimmicks fade and useful features stay.

---

## 5. Recommended intelligence for Myzel's looper (ranked)

All of the following works on **event loops**: notes with time, degree, octave, velocity, sound source, height (y) and release, plus Gestik and Fährte curves. Recording at the gesture layer is described in code-map §8B. Items 1 and 9 also serve audio loops. Ranks reflect musical value per unit of risk.

### 5.1 Rank 1: Service intelligence (always on, never changes notes)

**a) Bar and tempo inference from a free first loop**
- *Input:* onsets tᵢ, velocities vᵢ, the loop's start and end presses (or an auto-close candidate, below), and pitches and degrees.
- *If the Puls or MIDI clock runs:* the grid is known. Snap the start and end presses to the nearest bar line within a tolerance of about 180 ms *(estimate)*, keeping events played just before the press (pre-roll, like the existing ≈130 ms arm pre-roll).
- *If free:* the duration is L. For each candidate beat count n (2–64) with a tempo of 40–220 BPM, the beat period is T = L/n. Score each candidate as

  ```
  S(n) = Σᵢ wᵢ · exp(−dᵢ² / 2σ²)          // onsets near subdivisions of T (÷2, ÷3, ÷4); wᵢ grows with velocity; σ ≈ 25 ms
       + λ₁ · IOIagree(T)                    // IOI histogram peaks at T, T/2, 2T (Dixon-style clustering)
       + λ₂ · accent(n)                      // loud notes and bass notes on candidate downbeats
       + λ₃ · log prior(tempo)               // log-normal prior centred near 100 BPM
       + λ₄ · log prior(bars)                // 1, 2, 4, 8 bars favoured; 3/4 and 4/4 meters
  ```

  Pick the best candidate, and keep the next two as alternatives behind a swipe ("halbes Tempo / doppeltes Tempo / 3er-Takt"), because octave errors are the classic failure ([Dixon 2001](https://courses.cs.washington.edu/courses/cse590m/08wi/Dixon%20-%20Automatic%20Extraction%20of%20Tempo%20and%20Beat%20from%20Expressive%20Performances.pdf); tempo by onset autocorrelation and tempogram: [librosa](https://librosa.org/doc/main/generated/librosa.feature.tempogram.html), [Schreiber & Müller](https://archives.ismir.net/ismir2017/paper/000137.pdf)).
- *Output:* BPM, bars and downbeat phase. If no loop exists yet, offer to set the Puls tempo to the result. If the Puls already runs, the Puls wins and the loop is snapped to it. **Never time-stretch** (owner's rule).
- *Cost:* O(n·events), under 1 ms.

**b) Automatic loop closing ("Der Looper merkt, wenn du dich wiederholst")**
- For each new event, compare the last k events (k ≥ 5, spanning at least 1 s) with the first k events of the take. A match requires:
  - equal degree sequence (or equal interval sequence, if the player transposed);
  - every IOI ratio within ±15%.
- If they match and the implied length L has a good S(n), show a "Schleife schließen?" pulse. An option makes this automatic.
- This is a factor-oracle query: is the current suffix a prefix of the take? It is how many players already use loopers, playing the figure twice and closing on the repeat, made explicit.

**c) Retroactive capture ("Das war's")**
- An always-on event ring of about 2 minutes (events are tiny: about 30 bytes each).
- One tap searches the most recent material for the best loopable segment. Candidates are segments that end now, have a repetition (as in b), have a good S(n), and have a phrase boundary at both ends (as in 5.6a).
- This is the Ableton Capture idea ([help](https://help.ableton.com/hc/en-us/articles/360000776450-Capture-MIDI)), and it extends Myzel's existing Fährte behaviour ("tap = the last 1/2/4 bars become a loop"). The audio ring for retroactive *audio* capture is a separate memory decision (code-map: 12–25 MB).

**d) Scale following (harmonic intelligence that is cheap and deep)**
- Store every note as `{deg, oct, alt}` relative to the field's scale at record time (`N.notes`, `degNote`), plus the absolute frequency.
- When the field's root or scale changes, or a scene switches the scale, re-map according to the loop's setting:
  - **Diatonisch** (default): degree preserved, so Dorian becomes Lydian on the same degrees. A chromatic note (alt ≠ 0) is kept as an alteration if it is still a non-scale tone. Otherwise it is resolved to the nearest scale tone in the direction it was leaning.
  - **Transponieren:** shift by the root interval, chromatically exact.
  - **Fest:** absolute pitches.
- Optional per-loop flag "folgt der Harmonie". If a chord or scenario track exists in future (scenes as chord changes), bass-role loops re-root to the chord (degree relative to the chord root), and melody loops keep scale degrees ("scenario" in the ImproteK sense).
- *Key analysis is only needed for MIDI-keyboard input in "Chromatisch" mapping.* For that case, use the Krumhansl–Schmuckler or Temperley profiles: correlate the duration-weighted pitch-class histogram with 24 rotated profiles, with a change penalty between segments ([Temperley](https://music.informatics.indiana.edu/courses/I546/pdf/temperley.pdf)). Then derive degrees from the best key.

**e) Groove-preserving quantisation and groove transfer**
- After (a), compute for each onset its grid position p (16th or triplet grid) and its offset δ = t − grid(p).
- Build a **groove template** per metric position: mean offset, mean velocity and spread. From it derive the **swing ratio**, the ratio of the long to the short 8th (or 16th) note.
- Quantise toward *your* groove, not the grid:
  `t' = grid(p) + (1 − q)·δ + q·template(p)`.
  With q = 0 the input is untouched. With q = 1 every note sits exactly on the template, so it is "tight but yours".
- **Groove transfer:** the same template can be applied to other loops, the Puls (Myzel already has `seq.swing`) and generated notes.
- **Humanize** for generated notes: draw offsets from the template's spread with **long-range-correlated (1/f-like) noise**, not white noise. Hennig et al. showed that listeners strongly prefer long-range-correlated timing fluctuations and that DAW "humanize" functions are uncorrelated random generators ([PLoS ONE 2011](https://www.psych.uni-goettingen.de/de/cognition/publications/hennigetal2011), DOI 10.1371/journal.pone.0026457). This is the honest replacement for GrooVAE's humanize, and Myzel can learn the template from the player instead of from a dataset ([Groove MIDI Dataset](https://arxiv.org/abs/1905.06118)).

**f) Seam intelligence**
- For event loops: notes that are held over the seam are tied over, not retriggered.
- Fährte and Gestik curves are matched in value and slope at the seam with a short crossfade on the curve.
- Releases that ring past the end fold onto the start, as the existing `foldTail` does for audio.

### 5.2 Rank 2: Roles and "Mitspieler" (the Reflexive Looper core)

**a) Role classification of every loop layer**
- *Features*, from exact event data: median pitch and register, polyphony (mean simultaneous notes), mean duration relative to the beat, density (notes per beat), pitch range, share of notes on strong beats, and the sound source and its art ('hält' / 'schlägt' in `ENG_META`).
- *Classifier:* a hand-tuned weighted score per role (Bass, Akkorde, Melodie, Puls/Perkussion, Fläche), with a confidence. Cypher's feature set and the Reflexive Looper's three modes are the basis. Seed the weights by hand, then fit them on the owner's labelled takes with logistic regression (24 weights, trained once, offline).
- The player can always override the label with one tap on the layer.

**b) Live role of what the player is doing now**
- The same features over a sliding window of the last 1–2 bars give the role being played live.

**c) Policy "die anderen spielen"** (for Eigensinn ≥ 50%, or as a per-loop switch)
- Player plays melody: bass and chord layers play, other melody layers drop out or thin.
- Player plays bass: bass layers fade out at the bar line.
- Player stops: the full arrangement plays; after the configurable pause, an answer may follow (5.6).
- Changes happen only on bar lines, with hysteresis: the new role must hold for at least one bar.
- Mutes are fades (equal-power, 20–50 ms *(estimate)*) on the loop's strip or per-layer gain. Nothing is cut mid-note.

### 5.3 Rank 3: Variation engine with Eigensinn (the evolving loop)

**a) Operators.** Each operator is musically meaningful, in GenJam's sense, and constrained:
- *Rhythm-preserving pitch variation:*
  - a weak-position note moves to a neighbour degree (±1 or ±2);
  - contour signs (up, down, same) are kept, so it is "the same gesture, other notes" (the Piano Genie idea, without a network);
  - strong-position notes, the anchors, are kept.
- *Pitch-preserving rhythm variation:*
  - rotation of the onset necklace by k steps;
  - Euclidean redistribution with the same onset count ([Toussaint](https://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf); Myzel's Puls is already Euclidean);
  - split or merge of notes on weak positions;
  - anticipation (moving a note an 8th early).
- *Density:*
  - thinning removes the notes with the lowest metric weight × velocity first;
  - filling adds passing or neighbour tones between notes a third or more apart, in scale.
- *Register:* octave displacement of single notes, within the source's good range.
- *Ornament:* grace notes, turns and repeated-note rolls (Myzel's `Wirbel`). The physical models respond to these expressively.
- *Recombination:* swap a half-bar with another half-bar of the same loop or session that shares its first and last degree. This is a factor-oracle jump.
- *Timbre and expression:* small drifts of y (height, timbre) and velocity along the loop. These are free with Myzel's models, which are "never twice the same".

**b) Per pass**, in the background during the previous pass:
- Generate N candidates, about 16, each from 1–3 operators.
- Score each candidate:

  ```
  score = α·consistency(anchor, cand)        // degree edit distance, onset distance, pitch-class histogram distance
        + (1 − α)·novelty(cand, last m passes)
        + β·fit(cand)                         // scale stability on strong beats, voice leading against other layers, groove fit
        − γ·repeatPenalty
  ```

  α falls as Eigensinn rises.
- Choose by softmax with a temperature set by Eigensinn, using the loop's seeded RNG.

**c) Evolution with an elastic return**
- Accepted variants accumulate, so the loop drifts.
- Each pass, with a probability that grows with the distance to the anchor × (1 − Eigensinn), the looper takes one step back toward the anchor. The loop "breathes" around the original and never drifts away unasked.
- Lob makes the current variant the anchor. Nein reverts and lowers that operator's weight for the session.

**d) Vorschau:** the changed notes of the next pass are drawn as ghost notes one bar before they sound.

### 5.4 Rank 4: Energy and density following

- Compute live energy over 1–2 bars with exponential smoothing: E = w₁·notes per second + w₂·mean velocity + w₃·register height + w₄·polyphony + w₅·Gestik "Ladung".
- Three modes:
  - **Folgen:** loops thicken (fill operators, more layers) as E rises.
  - **Platz machen:** loops thin (thinning operator, quieter ornaments) as E rises. This is the band-member behaviour.
  - **Kontra:** at Eigensinn > 75%, the looper occasionally does the opposite for a phrase (Voyager's "oppose").
- The control acts on *notes and arrangement*, never on sound quality. No engine is simplified to save cost (owner's rule).

### 5.5 Rank 5: Accompaniment from a melody loop ("Trio mit dir selbst")

**a) Harmonisation**
- Per bar or half-bar, the candidates are the diatonic triads and seventh chords of the current scale.
- Emission score: duration-weighted melody pitch classes that are chord tones, with strong beats weighted ×2. Non-chord tones are allowed on weak beats.
- Transition score: a functional prior (I–IV–V–vi motion more likely than random), the player's own past chord loops if any (a first-order Markov model of their progressions), and the cadence position (the last bar prefers I or V).
- **Viterbi** over the bars finds the best sequence. This is an HMM with about 7–14 states and at most 16 steps, which takes microseconds.

**b) Bass:**
- roots and fifths on strong beats, with chromatic or diatonic approach tones on the last 8th before a chord change;
- the rhythm comes from the player's groove template;
- the sound source is the player's bass-role source (for example Amöbe).

**c) Chords:**
- voice-led from the previous chord (minimal total semitone movement, common tones held, about 3–4 voices in a pleasant register);
- the rhythm is either sustained or the player's comping pattern if one exists.

**d) Drums or percussion ("Drumify" without GrooVAE):**
- from the melody's accent pattern, accents on 1 and 3 go to the low struck source and backbeats to the snare-like source;
- the subdivision comes from the groove template's densest grid;
- velocities follow the template;
- sources: Myzel's struck engines, such as Zapfen, Jahresring and the Puls lanes.
- This could be offered as "Puls aus meiner Schleife": fill Puls lanes from the analysis.

**e) Option:** offer the generated parts as *suggestions*. They play muted with ghost display, and one tap turns each on (the Cococo lesson: piece by piece).

### 5.6 Rank 6: Answers (Continuator, factor oracle, scenario)

**a) Phrase segmentation**
- Compute a boundary score per gap between notes, LBDM-style ([Cambouropoulos LBDM, as described in](https://arxiv.org/pdf/2001.01720)): the change and proximity of IOI, pitch interval and rest, plus a velocity drop and a long final note.
- A phrase ends when the gap exceeds max(0.3 s, 2 × median IOI) *(estimate)* and the boundary score is high. The Continuator uses about 250 ms.

**b) Model**
- A variable-order Markov model or factor oracle over tokens. Each token is (degree interval to the previous note, duration class, metric position class), with a fallback viewpoint of (contour, duration class). Learn it incrementally from everything the player plays in the session ("Gedächtnis" scope).
- **MaxOrder** caps verbatim copies, for example no more than 6 consecutive tokens copied from the corpus ([AAAI 2014](https://ojs.aaai.org/index.php/AAAI/article/view/9126), book: [Constrained Markov Sequence Generation](https://link.springer.com/978-3-319-43496-4)).

**c) Answer**
- Generate the answer with **beam search**, or as a small Markov-constraint problem.
- Constraints:
  - length of about the length of the call (±1 bar);
  - starts on the next beat after the call ends;
  - ends on a stable degree (1, 3 or 5 of the current chord or scale) at a strong position;
  - fits the *coming* harmony if it is known (scenario query, ImproteK).
- **Somax-style listening while playing:** at Eigensinn > 75% the answer may *overlap* the player instead of strictly taking turns. Corpus positions whose labels match the last few live notes get an activation that decays over about 2–4 s, and the generator prefers continuations from the most activated positions.

**d) Turn-taking**
- The answer stops gracefully, at the next note boundary with a short release, when the player starts a new phrase.
- The voice is selectable: the player's own source (mirror), or a complementary source (dialogue).

### 5.7 Rank 7: Audio loops (if and where the looper records audio)

- **Seam:** snap the loop end to the nearest onset within ±30 ms (spectral flux or SuperFlux in the tap). Then search ±5 ms for the cross-correlation maximum between the end and the start window. Apply an equal-power crossfade of 5–30 ms: longer for sustained material, and at least 2–3 periods of the lowest pitch ([WaveLab Loop Tweaker](https://archive.steinberg.help/wavelab_pro/v11/en/wavelab/topics/loops/loop_points_good_detect_automatically_t.html), [The Art of Looping](https://www.muzines.co.uk/articles/the-art-of-looping/2228)). The existing `foldTail` already folds the ring-out.
- **Free tempo:** onset-envelope autocorrelation over the take, scored as in 5.1a.
- **Audio becomes notes (optional, later):** a hand-ported Basic Pitch (or Harmonica-nano, if released) in a Worker transcribes a recorded *mic* loop within a few seconds. The resulting events can then get scale following, variation and accompaniment, played by Myzel's own voices. For monophonic voice input, PESTO or YIN in a Worker.
- **Without transcription, audio intelligence is limited** to slicing at onsets: reorder, repeat or mute slices on the grid, with crossfades. This is a legitimate "Variieren" for audio loops and costs nothing, but it cannot change harmony.

### 5.8 Rank 8: Optional neural prior (only after the rule-based version is judged)

- A **tiny GRU** of about 0.1–0.3 M parameters, int8, inference in hand-written JavaScript, trained *offline* by us on a public symbolic corpus or on the owner's own takes.
- It is used as a *prior blended with* the session Markov model (Pachet's fitness blending). Its job is to make answers less "babbly" when little session material exists.
- Sampling is constrained to scale tones and grid positions, the Notochord idea of interventions at the sub-event level.
- **Ship only if** blind A/B listening against the pure-Markov version shows a clear improvement. The cost is about 0.3–0.4 MB in the file and a training pipeline outside the app.

### 5.9 Not recommended

- MRT2, Magenta RT and Lyria RealTime as part of the instrument.
- RAVE, BRAVE and DDSP timbre transfer.
- The GrooVAE and MusicVAE checkpoints.
- ONNX Runtime Web, TF.js and Essentia.js as dependencies.

The reasons are in §3.6. None fits offline, phone, single file and Myzel's own sound. All are server- or desktop-class, or 10–100 times the size of the app.

### 5.10 Rough size and effort *(estimates)*

- Ranks 1–6: about 1,500–2,500 lines of JavaScript (about 40–80 KB), no data files, all on the main thread or in a Blob-URL Worker.
- Analysis takes under 20 ms per take, and the variation search runs in the background within one pass.
- The audio-thread cost is zero beyond playback itself. That playback cost, however, is real (§7).

---

## 6. Honest limits

- **Loops, not form.** Markov and oracle models are locally plausible and globally aimless. They do not plan a song: intro, build, drop, return. Large-scale form must come from the player, through scenes, Puls changes or an explicit "scenario". No on-device model in 2026 changes that. The research systems with real structure use transformers on servers.
- **Little material means little intelligence.** In the first minute of a session, the style model has too little data. It will either copy or babble, so it should wait. A neural prior (5.8) helps only partly and costs size.
- **Inference is ambiguous.**
  - Sparse or rubato first loops have several valid tempo and bar readings. Octave errors will happen, so the quick correction swipe is part of the feature, not a fallback.
  - Role classification fails on ambiguous material. An arpeggio can be chords or melody, and a high bass ostinato is still bass. The one-tap override is essential.
- **No harmonic "understanding" beyond the scale and simple chords.** The harmoniser chooses diatonic chords per bar. It does not do jazz reharmonisation, modal interchange or voice leading of a professional arranger. It will sound correct and sometimes plain.
- **Audio loops stay mostly dumb.** Without transcription, an audio loop can only be sliced and rearranged. With transcription (Basic Pitch class), polyphonic accuracy is good but not perfect, so transcribed notes need a visual check.
- **The real neural music models are out of reach in the browser.** Audio generation (MRT2, Lyria, Stable Audio), timbre transfer (RAVE, DDSP) and large symbolic transformers (ReaLchords, AMT) need a TPU or GPU, Apple Silicon, a native app or a server in October 2026. WebGPU is missing on many mid-range Android phones and on iOS < 26. WebNN is only an origin trial. Threads need cross-origin isolation, which GitHub Pages cannot give except through a service worker, and not at all from `file://` or in the claude.ai view.
- **Timing in the browser.**
  - Main-thread jank can delay *decisions*, but never playback, which is scheduled with look-ahead. Background tabs throttle timers, and iOS may suspend audio.
  - Motion sensors deliver about 60 Hz with jitter. Gestik curves are loopable, but gestures cannot be used for tight rhythmic triggering.
  - Output latency (Bluetooth 100–300 ms) is not measured by Myzel. A looper that aligns *recorded* events to *heard* audio needs a latency calibration (the Gestik Klopf-Messung is a precedent).
- **Evaluation is ultimately the owner's ear.** The metrics in §4.4 are proxies. "Is it musical?" is decided in listening sessions, and that is slow.
- **This research is second-hand in places.** Many full texts could not be retrieved in this session, as explained at the top. Mechanisms marked as background knowledge (Somax peaks, Voyager's timing, Continuator viewpoints, Notochord size) are standard descriptions but were not re-read here.

---

## 7. Decisions for the owner

1. **Event loops or audio loops, or both.**
   - Event loops are needed for every co-player feature and for scale and tempo following. They re-perform through real voices, so the sound is the full live sound and alive on every pass. But each layer consumes voice budget (`VBUDGET` 14 units on mobile at level 1, VCOST measured per source). On a mid-range phone, three or four layers of expensive sources will steal voices from the live playing.
   - Audio loops are exact and cheap to play, but cannot follow scale or tempo without resampling or time-stretch, which the owner's rule excludes.
   - Two possible combinations, both needing a decision: (a) record both and play the audio print at Eigensinn 0, switching to re-performance only when the loop varies or follows; (b) pre-render the *next* varied pass offline (OfflineAudioContext with the same engines) during the current pass and play it as audio. Option (b) is technically uncertain: shared effects, the Gespinst web and worklet state, and render speed on phones would all need checking.
   - Under the standing rule, I would not reduce any engine's quality to make layers fit. The question is only how many re-performed layers to allow.
2. **Whether the co-player features (5.2–5.6) belong in the first version**, or whether version 1 ships service intelligence only (5.1, 5.7), with the Eigensinn knob added once Wizard-of-Oz tests confirm the behaviours.
3. **Whether any online extra (Lyria RealTime) is wanted at all.** My recommendation is no: it brings a foreign sound and needs an API key and a network connection.
4. **Whether a 0.3–0.4 MB neural prior (5.8) is acceptable in the file**, if listening tests show that it helps.
