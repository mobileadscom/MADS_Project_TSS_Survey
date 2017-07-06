/* global window, XMLHttpRequest, location */

import Mads, { fadeIn, fadeOutIn, fadeOut } from 'mads-custom';
import './main.css';

class AdUnit extends Mads {
  constructor() {
    super();
    this.currentQuestion = 0;
    this.results = [];
    this.polled = false;
  }

  render() {
    this.results = new Array(this.data.questions.length);

    return `
      <div class="ad-container" id="adContainer">
        <div id="firstContainer">
          <div style="margin-bottom: 20px;font-size:23px; width: 290px;">How do you feel about Tennessee's school system?</div>
          <div id="enter">ENTER</div>
        </div>
        <div id="questionContainer"></div>
        <div id="controlContainer">
          <img src="img/larrow.png" style="pointer-events: none;" id="prev" alt="previous" />
          <img src="img/rarrow.png" style="pointer-events: none;" id="next" alt="next" />
        </div>
        <div id="indicatorContainer">${this.currentQuestion + 1}/${this.data.questions.length}</div>
      </div>
    `;
  }

  postRender() {
    window.addEventListener('message', (e) => {
      if (typeof e.data.auth !== 'undefined' && e.data.auth.type === 'closeExpandable') {
        this.sendPoll();
      }
    }, false);
  }

  renderQuestion(questionIndex = 0) {
    this.currentQuestion = questionIndex;
    const elem = this.elems.questionContainer;
    const item = this.data.questions[questionIndex];
    const next = this.elems.next;
    const prev = this.elems.prev;

    if (!item) {
      this.renderEnd();
    } else {
      switch (this.currentQuestion) {
        case 0: {
          prev.style.pointerEvents = 'none';
          prev.style.opacity = 0;

          next.style.pointerEvents = 'none';
          next.style.opacity = 0.5;

          if (this.results[this.currentQuestion]) {
            next.style.pointerEvents = '';
            next.style.opacity = 1;
          }
          break;
        }
        case this.data.questions.length - 1: {
          prev.style.pointerEvents = '';
          prev.style.opacity = 1;

          next.style.pointerEvents = 'none';
          next.style.opacity = 0;
          break;
        }
        default:
          prev.style.pointerEvents = 'none';
          prev.style.opacity = 0.5;

          next.style.pointerEvents = 'none';
          next.style.opacity = 0.5;

          if (this.results[this.currentQuestion - 1]) {
            prev.style.pointerEvents = '';
            prev.style.opacity = 1;
          }

          if (this.results[this.currentQuestion]) {
            next.style.pointerEvents = '';
            next.style.opacity = 1;
          }
      }

      const questionTrackerType = `QID${this.currentQuestion + 1}`;
      this.tracker('E', questionTrackerType);
      // eslint-disable-next-line no-template-curly-in-string
      // const questionCustomTracker = [((this.custTracker[1] && this.custTracker[1]) || 'https://trk.mwstats.net/stats/interaction.png?ii=TRACKER_TYPE&id=${mw_bid_id}&li=${mw_lineitem_id}&t=${mw_timestamp}&cr=${mw_creative_id}').replace('TRACKER_TYPE', questionTrackerType)];
      // this.imageTracker(questionCustomTracker);

      this.elems.indicatorContainer.innerText = `${this.currentQuestion + 1}/${this.data.questions.length}`;

      let question = `
        <div class="question">${this.currentQuestion + 1}. ${item.question}</div>
      `;

      item.answers.forEach((a) => {
        question += `<div class="answer${this.results[this.currentQuestion] && this.results[this.currentQuestion].answer === a ? ' selected' : ''}">${a}</div>`;
      });

      elem.innerHTML = question;

      fadeIn(elem);

      this.elems.adContainer.querySelectorAll('.answer').forEach((answer) => {
        answer.onclick = () => { // eslint-disable-line no-param-reassign
          const answerIndex = this.data.questions[this.currentQuestion]
            .answers.indexOf(answer.innerText);
          const trackerType = `QID${this.currentQuestion + 1}_Opt${answerIndex + 1}`;
          this.tracker('E', trackerType);
          // eslint-disable-next-line no-template-curly-in-string
          // const customTracker = [((this.custTracker[1] && this.custTracker[1]) || 'https://trk.mwstats.net/stats/interaction.png?ii=TRACKER_TYPE&id=${mw_bid_id}&li=${mw_lineitem_id}&t=${mw_timestamp}&cr=${mw_creative_id}').replace('TRACKER_TYPE', trackerType)];
          // this.imageTracker(customTracker);
          this.results[this.currentQuestion] = {
            answer: answer.innerText,
            index: answerIndex,
            trackerType,
            questionTrackerType,
          };
          this.renderQuestion(this.currentQuestion + 1);
        };
      });
    }

    return new Promise((resolve) => {
      resolve();
    });
  }

  renderEnd() {
    const ad = this.elems.adContainer;
    ad.innerHTML += `<div class="end-container" id="endContainer"><div>${this.data.messages.end}</div></div>`;
    fadeOutIn(
      ad.querySelector('#questionContainer'),
      ad.querySelector('#endContainer'),
      {
        display: 'flex',
      },
    );

    ad.querySelector('#endContainer').onclick = () => {
      this.tracker('CTR', { name: 'landing_page', exclude: true });
      this.linkOpener('http://tnsuccess.org/');
    };

    fadeOut(ad.querySelector('#indicatorContainer'));
    fadeOut(ad.querySelector('#controlContainer'));
  }

  style() {
    const links = [];

    return [...links,
      `
      #adContainer, #firstContainer {
        background-color: ${this.data.styles.backgroundColor};
      }      
    `];
  }

  events() {
    this.elems.next.onclick = () => {
      this.renderQuestion(this.currentQuestion + 1);
    };

    this.elems.prev.onclick = () => {
      this.renderQuestion(this.currentQuestion - 1);
    };

    this.elems.enter.onclick = () => {
      this.renderQuestion(0);
      fadeOutIn(this.elems.firstContainer, this.elems.questionContainer, { display: 'block' });
    };
  }

  sendPoll() {
    const xhr = new XMLHttpRequest();
    const url = 'https://www.cdn.serving1.net/poll';

    const getURLParameter = (name, custom) => {
      const d = decodeURIComponent((new RegExp(`[?|&]${name}=([^&;]+?)(&|#|;|$)`)
      // eslint-disable-next-line no-sparse-arrays
        .exec((typeof custom !== 'undefined' ? custom : location.search)) || [, ''])[1].replace(/\+/g, '%20'));
      return d || null;
    };

    let poll = '';
    this.results.forEach((item, ix) => {
      if (item) {
        poll += `${item.questionTrackerType}=${item.answer}${this.results.indexOf(item) === this.results.length - 1 ? '' : '&'}`;
      } else {
        poll += `QID${ix + 1}=skipped${ix === this.results.length - 1 ? '' : '&'}`;
      }
    });

    const campaignId = getURLParameter('campaignId', this.custTracker[0]);
    const rmaId = getURLParameter('rmaId', this.custTracker[0]);
    const userId = getURLParameter('userId', this.custTracker[0]);
    const cb = getURLParameter('id', this.custTracker[1]);
    poll = `campaignId=${campaignId}&rmaId=${rmaId}&userId=${userId}&cb=${cb}&${poll}`;

    if (!this.polled) {
      xhr.open('POST', `${url}?${poll}`, true);
      xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          this.polled = true;
        }
      };
      xhr.send(poll);
    }
  }
}

window.ad = new AdUnit();
