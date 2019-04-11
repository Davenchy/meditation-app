class Timer {
  constructor () {
    this.timerId = null;
    this.isPlaying = false;
    this.onTick;
    this.onPlay;
    this.onStop;
    this.onReset;
    this.onSetTick;
    this.onRemoveTick;
    this.ticks = 0;
    this.timers = [];
    this.tickDuration = 1000;
    this.ticksLimit = 50;
    this.__tickTimerId__ = 0;
  }

  __call__(name, ...args) {
    if (this[name]) this[name].apply(this, args);
  }

  setTick(ticks, cb, once = true) {
    if (!ticks || !cb) return;
    const tick = { id: this.__tickTimerId__, ticks, cb, once };
    this.timers.push(tick);
    this.__call__('onSetTick', tick);
    return this.__tickTimerId__++;
  }

  removeTick(id) {
    const index = this.timers.findIndex(timer => timer.id === id);
    if (index !== -1) {
      this.__call__('onRemoveTick', this.timers[index]);
      this.timers.splice(index, 1);
    }
  }

  play() {
    if (this.timerId) this.stop();
    this.__call__('onPlay');
    this.isPlaying = true;
    this.timerId = setInterval((self) => {
      // count
      if (!self.isPlaying) self.stop();
      self.ticks++;
      self.__call__('onTick', self.ticks);

      // call all callbacks of timers
      self.timers
        .filter(timer => {
          if (timer.once) return self.ticks === timer.ticks;
          else self.ticks >= timer.ticks;
        })
        .forEach(timer => timer.cb(self));

      // stop timer after ticks limit
      if (self.ticks >= self.ticksLimit && self.ticksLimit !== 0)
        self.reset();
    }, this.tickDuration, this);
  }

  reset() {
    this.stop();
    this.ticks = 0;
    this.__call__('onReset');
  }

  stop() {
    if (!this.timerId) return;
    clearInterval(this.timerId);
    this.timerId = null;
    this.isPlaying = false;
    this.__call__('onStop');
  }
}



/* app starts from here */

const app = () => {
  const durationButtons = document.querySelectorAll('.left-section button');
  const themeButtons = document.querySelectorAll('.right-section button');
  const playingBTN = document.querySelector('.playing-btn');
  const video = document.querySelector('.video-container video');
  const audio = document.querySelector('.player audio');
  const bell = document.querySelector('#bell');
  const timerDisplay = document.querySelector('.timerDisplay');
  const trackOutline = document.querySelector('.player .track-outline circle')

  const settings = document.querySelector('.settings');
  const audioVolume = document.querySelector('#audio');
  const storage = window.localStorage;

  let duration = storage.getItem('duration') || 120;

  const toggleSettings = () => {
    settings.classList.toggle('active');
  };

  const setTheme = (name) => {
    if (!name) name = storage.getItem('theme') || 'rain';
    storage.setItem('theme', name);
    video.src = `./video/${name}.mp4`;
    audio.src = `./sounds/${name}.mp3`;
    const audioVol = parseInt(storage.getItem('audio') || 100);
    const enableVideo = storage.getItem('video') || 'true';
    audioVolume.innerText = audioVol === 0 ? 'Muted' : `${audioVol}%`;
    if (audioVol !== 0) audio.play();
    audio.volume = audioVol / 100;
    if (enableVideo === 'true') video.play();
  };

  document.querySelectorAll('.settings-btn').forEach(button => {
    button.addEventListener('click', toggleSettings);
  });

  document
    .querySelector('.settings .reset')
    .addEventListener('click', () => {
      storage.clear();
      location.reload();
    });

  document.querySelectorAll('.settings .audioSettings button').forEach(button => {
    button.addEventListener('click', () => {
      const vol = button.getAttribute('data-audio');
      storage.setItem('audio', parseInt(vol));
      setTheme();
    });
  });

  document.querySelectorAll('.settings .videoSettings button').forEach(button => {
    button.addEventListener('click', () => {
      const isEnabled = button.getAttribute('data-video');
      storage.setItem('video', isEnabled);
      setTheme();
    });
  });

  const Bell = () => {
    bell.currentTime = 0;
    bell.volume = 1;
    bell.play();
  }

  const setTrackProgress = (progress = 0) => {
    const len = trackOutline.getTotalLength();
    trackOutline.style.strokeDasharray = len;
    trackOutline.style.strokeDashoffset = len + len * progress / 100;
  }

  const setTimerDisplay = (time) => {
    const clean = (x) => {
      x = Math.floor(x);
      if (x === 0) return '00';
      else if (x < 10) return `0${x}`;
      return `${x}`;
    }

    const s = clean(((time % 3600) % 60));
    const m = clean((time % 3600) / 60);
    const h = clean(time / 3600);
    timerDisplay.innerText = `${h}:${m}:${s}`;
    setTrackProgress(100 * time / duration);
  };

  const getCustomTime = () => {
    const ans = prompt('Enter time [ends with "s" or "m" or "h"]', '120s') || '0';
    let t = parseFloat(ans) || 0;
    if (ans.endsWith('m')) t *= 60;
    else if (ans.endsWith('h')) t *= 3600;
    return parseInt(t);
  }

  const timer = new Timer();

  timer.onTick = () => {
    setTimerDisplay(duration - timer.ticks);
    storage.setItem('ticks', timer.ticks);
  };

  timer.onPlay = () => {
    playingBTN.src = './svg/pause.svg';
    storage.setItem('ticks', 0);
  }

  timer.onStop = () => {
    playingBTN.src = './svg/play.svg';
    if (duration === timer.ticks) {
      timer.reset();
      setTimerDisplay(duration);
      Bell();
      storage.setItem('ticks', 0);
    }
  }

  playingBTN.addEventListener('click', () => {
    if (timer.isPlaying) timer.stop();
    else timer.play();
  });

  durationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      timer.reset();
      let data = btn.getAttribute('data-duration');
      if (data === 'custom') data = getCustomTime();
      duration = parseInt(data);
      timer.ticksLimit = duration;
      setTimerDisplay(duration);
      storage.setItem('duration', duration);
    });
  });

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-theme');
      if (name) setTheme(name);
    });
  });

  document
    .querySelector('.timerDisplay')
    .addEventListener('click', () => {
      timer.reset();
      setTimerDisplay(duration);
    });

  // set defaults and run;
  timer.ticksLimit = duration;
  timer.ticks = storage.getItem('ticks') || 0;
  setTimerDisplay(duration);
  setTheme();
};

window.addEventListener('load', app);
