import {Emitter} from '../../../lib/src/Emitter';
import {textUtil} from '../../../lib/src/text/textUtil';
import {Config} from '../../../../src/Config';
import * as _ from "lodash"
import {NicoChat} from "./NicoChat"

//===BEGIN===

export type SHARED_NG_LEVEL_TYPE = typeof NicoChatFilter.SHARED_NG_LEVEL[keyof typeof NicoChatFilter.SHARED_NG_LEVEL]

export type NicoChatFilterParams = {
  sharedNgLevel?: SHARED_NG_LEVEL_TYPE
  removeNgMatchedUser?: boolean
  enableFilter?: boolean
  fork0?: boolean
  fork1?: boolean
  fork2?: boolean
  wordFilter?: string | string[]
  userIdFilter?: string | string[]
  commandFilter?: string | string[]
  /** 正規表現 */
  wordRegFilter?: string
  /** wordRegFilter の正規表現のフラグ */
  wordRegFilterFlags?: string
}

class NicoChatFilter extends Emitter<{
  change: [],
}> {
  static SHARED_NG_LEVEL = {
    NONE: 'NONE',
    LOW: 'LOW',
    MID: 'MID',
    HIGH: 'HIGH',
    MAX: 'MAX'
  } as const

  static SHARED_NG_SCORE = {
    NONE: -99999,//Number.MIN_VALUE,
    LOW: -10000,
    MID: -5000,
    HIGH: -1000,
    MAX: -1
  } as const

  _sharedNgLevel: SHARED_NG_LEVEL_TYPE
  _removeNgMatchedUser: boolean
  _wordFilterList: string[] = [];
  _userIdFilterList: string[] = [];
  _commandFilterList: string[] = [];
  _fork0: boolean
  _fork1: boolean
  _fork2: boolean
  _enable: boolean
  _wordReg?: RegExp
  _wordRegReg?: RegExp
  _userIdReg?: RegExp
  _commandReg?: RegExp
  _flags?: string

  constructor(params: NicoChatFilterParams) {
    super();
    this._sharedNgLevel = params.sharedNgLevel || NicoChatFilter.SHARED_NG_LEVEL.MID;
    this._removeNgMatchedUser = params.removeNgMatchedUser || false;

    this.wordFilterList = params.wordFilter || '';
    this.userIdFilterList = params.userIdFilter || '';
    this.commandFilterList = params.commandFilter || '';
    this._fork0 = typeof params.fork0 === 'boolean' ? params.fork0 : true;
    this._fork1 = typeof params.fork1 === 'boolean' ? params.fork1 : true;
    this._fork2 = typeof params.fork2 === 'boolean' ? params.fork2 : true;

    this._enable = typeof params.enableFilter === 'boolean' ? params.enableFilter : true;

    this._onChange = _.debounce(this._onChange.bind(this), 50);

    if (params.wordRegFilter) {
      this.setWordRegFilter(params.wordRegFilter, params.wordRegFilterFlags);
    }
  }
  get isEnable() {
    return this._enable;
  }
  set isEnable(v) {
    if (this._enable === v) {
      return;
    }
    this._enable = !!v;
    this._onChange();
  }
  get removeNgMatchedUser() {
    return this._removeNgMatchedUser;
  }
  set removeNgMatchedUser(v) {
    if (this._removeNgMatchedUser === v) {
      return;
    }
    this._removeNgMatchedUser = !!v;
    this.refresh();
  }
  get fork0() { return this._fork0; }
  set fork0(v) {
    v = !!v;
    if (this._fork0 === v) { return; }
    this._fork0 = v;
    this.refresh();
  }
  get fork1() { return this._fork1; }
  set fork1(v) {
    v = !!v;
    if (this._fork1 === v) { return; }
    this._fork1 = v;
    this.refresh();
  }
  get fork2() { return this._fork2; }
  set fork2(v) {
    v = !!v;
    if (this._fork2 === v) { return; }
    this._fork2 = v;
    this.refresh();
  }
  refresh() { this._onChange(); }
  addWordFilter(text?: string) {
    let before = this._wordFilterList.join('\n');
    this._wordFilterList.push((text || '').trim());
    this._wordFilterList = [...new Set(this._wordFilterList)];
    let after = this._wordFilterList.join('\n');
    if (before === after) { return; }
    this._wordReg = undefined;
    this._onChange();
  }
  set wordFilterList(list: string | string[]) {
    list = [...new Set(typeof list === 'string' ? list.trim().split('\n') : list)];

    let before = this._wordFilterList.join('\n');
    let tmp: string[] = [];
    list.forEach(text => {
      if (!text) { return; }
      tmp.push(text.trim());
    });
    tmp = _.compact(tmp);
    let after = tmp.join('\n');

    if (before === after) { return; }
    this._wordReg = undefined;
    this._wordFilterList = tmp;
    this._onChange();
  }
  get wordFilterList() {
    return this._wordFilterList;
  }

  setWordRegFilter(source: string, flags?: string) {
    if (this._wordRegReg) {
      if (this._wordRegReg.source === source && this._flags === flags) {
        return;
      }
    }
    try {
      this._wordRegReg = new RegExp(source, flags);
      this._flags = flags
    } catch (e) {
      window.console.error(e);
      return;
    }
    this._onChange();
  }

  addUserIdFilter(text: string) {
    const before = this._userIdFilterList.join('\n');
    this._userIdFilterList.push(text);
    this._userIdFilterList = [...new Set(this._userIdFilterList)];
    const after = this._userIdFilterList.join('\n');
    if (before === after) { return; }
    this._userIdReg = undefined;
    this._onChange();
  }
  set userIdFilterList(list_: string | string[]) {
    const list = [...new Set(typeof list_ === 'string' ? list_.trim().split('\n') : list_)];

    let before = this._userIdFilterList.join('\n');
    let tmp: string[] = [];
    list.forEach(text => {
      if (!text) { return; }
      tmp.push(text.trim());
    });
    tmp = _.compact(tmp);
    let after = tmp.join('\n');

    if (before === after) { return; }
    this._userIdReg = undefined;
    this._userIdFilterList = tmp;
    this._onChange();
  }
  get userIdFilterList() {
    return this._userIdFilterList;
  }
  addCommandFilter(text: string) {
    let before = this._commandFilterList.join('\n');
    this._commandFilterList.push(text);
    this._commandFilterList = [...new Set(this._commandFilterList)];
    let after = this._commandFilterList.join('\n');
    if (before === after) { return; }
    this._commandReg = undefined;
    this._onChange();
  }
  set commandFilterList(list_: string | string[]) {
    const list = [...new Set(typeof list_ === 'string' ? list_.trim().split('\n') : list_)];

    let before = this._commandFilterList.join('\n');
    let tmp: string[] = [];
    list.forEach(text => {
      if (!text) { return; }
      tmp.push(text.trim());
    });
    tmp = _.compact(tmp);
    let after = tmp.join('\n');

    if (before === after) { return; }
    this._commandReg = undefined;
    this._commandFilterList = tmp;
    this._onChange();
  }
  get commandFilterList() {
    return this._commandFilterList;
  }

  set sharedNgLevel(level) {
    if (NicoChatFilter.SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
      this._sharedNgLevel = level;
      this._onChange();
    }
  }
  get sharedNgLevel() {
    return this._sharedNgLevel;
  }
  getFilterFunc(): (chat: NicoChat) => boolean {
    if (!this._enable) {
      return () => true;
    }
    const threthold = NicoChatFilter.SHARED_NG_SCORE[this._sharedNgLevel];

    // NG設定の数×コメント数だけループを回すのはアホらしいので、
    // 連結した一個の正規表現を生成する
    if (!this._wordReg) {
      this._wordReg = this._buildFilterReg(this._wordFilterList);
    }
    const umatch = this._userIdFilterList.length ? this._userIdFilterList : null;
    if (!this._commandReg) {
      this._commandReg = this._buildFilterReg(this._commandFilterList);
    }
    const wordReg = this._wordReg;
    const wordRegReg = this._wordRegReg;
    const commandReg = this._commandReg;

    if (Config.getValue('debug')) {
      return nicoChat => {
        if (nicoChat.fork === 1) {
          return true;
        }
        const score = nicoChat.score;
        if (score <= threthold) {
          window.console.log('%cNG共有適用: %s <= %s %s %s秒 %s', 'background: yellow;',
            score,
            threthold,
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.text
          );
          return false;
        }
        let m;
        wordReg && (m = wordReg.exec(nicoChat.text));
        if (m) {
          window.console.log('%cNGワード: "%s" %s %s秒 %s', 'background: yellow;',
            m[1],
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.text
          );
          return false;
        }

        wordRegReg && (m = wordRegReg.exec(nicoChat.text));
        if (m) {
          window.console.log(
            '%cNGワード(正規表現): "%s" %s %s秒 %s',
            'background: yellow;',
            m[1],
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.text
          );
          return false;
        }

        if (umatch && umatch.includes(nicoChat.userId)) {
          window.console.log('%cNGID: "%s" %s %s秒 %s %s', 'background: yellow;',
            nicoChat.userId,
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.userId,
            nicoChat.text
          );
          return false;
        }
        commandReg && (m = commandReg.exec(nicoChat.cmd));
        if (m) {
          window.console.log('%cNG command: "%s" %s %s秒 %s %s', 'background: yellow;',
            m[1],
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.cmd,
            nicoChat.text
          );
          return false;
        }

        return true;
      };
    }

    return nicoChat => {
      if (nicoChat.fork === 1) { //fork1 投稿者コメントはNGしない
        return true;
      }
      const text = nicoChat.text;
      return !(
        (nicoChat.score <= threthold) ||
        (wordReg && wordReg.test(text)) ||
        (wordRegReg && wordRegReg.test(text)) ||
        (umatch && umatch.includes(nicoChat.userId)) ||
        (commandReg && commandReg.test(nicoChat.cmd))
        );
    };
  }
  applyFilter(nicoChatArray: NicoChat[]) {
    let before = nicoChatArray.length;
    if (before < 1) {
      return nicoChatArray;
    }
    let timeKey = 'applyNgFilter: ' + nicoChatArray[0].type;
    window.console.time(timeKey);
    let filterFunc = this.getFilterFunc();
    let result = nicoChatArray.filter(filterFunc);
    if (before !== result.length && this._removeNgMatchedUser) {
      let removedUserIds =
        nicoChatArray.filter(chat => !result.includes(chat)).map(chat => chat.userId);
      result = result.filter(chat => !removedUserIds.includes(chat.userId));
    }
    if (!this.fork0 || !this.fork1 || !this.fork2) {
      const allows: number[] = [];
      this._fork0 && allows.push(0);
      this._fork1 && allows.push(1);
      this._fork2 && allows.push(2);
      result = result.filter(chat => allows.includes(chat.fork));
    }
    window.console.timeEnd(timeKey);
    window.console.log('NG判定結果: %s/%s', result.length, before);
    return result;
  }
  isSafe(nicoChat: NicoChat) {
    return (this.getFilterFunc())(nicoChat);
  }
  _buildFilterReg(filterList: string[]) {
    if (filterList.length < 1) {
      return;
    }
    const escapeRegs = textUtil.escapeRegs;
    let r = filterList.filter(f => f).map(f => escapeRegs(f));
    return new RegExp('(' + r.join('|') + ')', 'i');
  }
  _buildFilterPerfectMatchinghReg(filterList: string[]) {
    if (filterList.length < 1) {
      return;
    }
    const escapeRegs = textUtil.escapeRegs;
    let r = filterList.filter(f => f).map(f => escapeRegs(f));
    return new RegExp('^(' + r.join('|') + ')$');
  }
  _onChange() {
    console.log('NicoChatFilter.onChange');
    this.emit('change');
  }
}

//===END===
export {NicoChatFilter};

// return nicoChat => {
//   if (nicoChat.fork > 0) {
//     return true;
//   }

//   if (nicoChat.score <= threthold) {
//     return false;
//   }

//   if (wordReg && wordReg.test(nicoChat.text)) {
//     return false;
//   }

//   if (wordRegReg && wordRegReg.test(nicoChat.text)) {
//     return false;
//   }

//   if (userIdReg && userIdReg.test(nicoChat.text)) {
//     return false;
//   }

//   if (commandReg && commandReg.test(nicoChat.cmd)) {
//     return false;
//   }

//   return true;
// };
// }
