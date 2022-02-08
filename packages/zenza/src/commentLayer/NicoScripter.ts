import {Emitter} from '../../../lib/src/Emitter';
import {textUtil} from '../../../lib/src/text/textUtil';
import { NicoChat } from './NicoChat';
import { NicoChatGroup } from './NicoChatGroup';

//===BEGIN===

type JumpReturnValue = ReturnType<typeof NicoScriptParser.parseジャンプ>

type TAPJump<T extends JumpReturnValue["type"] = JumpReturnValue["type"]> = { type: T, params: JumpReturnValue }

type TypeAndParams =
  | { type: "DEFAULT", params?: undefined }
  | { type: "REVERSE", params: ReturnType<typeof NicoScriptParser.parse逆> }
  | { type: "MARKER", params: ReturnType<typeof NicoScriptParser.parseジャンプマーカー> }
  | { type: "REPLACE", params: ReturnType<typeof NicoScriptParser.parse置換 | typeof NicoScriptParser.parseReplace> }
  | { type: "PIPE", params: ReturnType<typeof NicoScriptParser.parseNiwango> }
  | { type: "COLOR", params: { color: string } }
  | TAPJump

type NicoScriptTypeToParams = {
  [key in TypeAndParams["type"] | JumpReturnValue["type"]]: 
    key extends JumpReturnValue["type"]
      ? JumpReturnValue | Extract<TypeAndParams, {type: key}>["params"]
      : Extract<TypeAndParams, {type: key}>["params"]
}

type ParsedNicos = { id: number } & TypeAndParams

type Nicos = ReturnType<typeof NicoScriptParser.parseNicos>

class NicoScriptParser {
  static _count = 1
  static get parseId() {
    return NicoScriptParser._count++;
  }

  static parseNiwango(lines: string[]) {
    // 構文はいったん無視して、対応できる命令だけ拾っていく。
    // ニワン語のフル実装は夢
    let type, params, m;
    const result = [];
    for (let i = 0, len = lines.length; i < len; i++) {
      const text = lines[i];
      const id = NicoScriptParser.parseId;
      if ((m = /^\/?replace\((.*?)\)/.exec(text)) !== null) {
        params = NicoScriptParser.parseReplace(m[1]);
        result.push({id, type: "REPLACE" as const, params});
      } else if ((m = /^\/?commentColor\s*=\s*0x([0-9a-f]{6})/i.exec(text)) !== null) {
        result.push({id, type: 'COLOR' as const, params: {color: '#' + m[1]}});
      } else if ((m = /^\/?seek\((.*?)\)/i.exec(text)) !== null) {
        params = NicoScriptParser.parseSeek(m[1]);
        result.push({id, type: 'SEEK' as const, params});
      }
    }
    return result;
  }


  static parseParams(str: string) {
    // 雑なパース
    let result: {[key: string]: string} = {}, v = '', lastC = '', key = "", isStr = false, quot = '';
    for (let i = 0, len = str.length; i < len; i++) {
      let c = str.charAt(i);
      switch (c) {
        case ':':
          key = v.trim();
          v = '';
          break;
        case ',':
          if (isStr) {
            v += c;
          }
          else {
            if (key !== '' && v !== '') {
              result[key] = v.trim();
            }
            key = v = '';
          }
          break;
        case ' ':
          if (v !== '') {
            v += c;
          }
          break;
        case '\'':
        case '"':
          if (v !== '') {
            if (quot !== c) {
              v += c;
            } else if (isStr) {
              if (lastC === '\\') {
                v += c;
              }
              else {
                if (quot === '"') {
                  // ダブルクォートの時だけエスケープがあるらしい
                  v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
                }
                result[key] = v;
                key = v = '';
                isStr = false;
              }
            } else {
              window.console.error('parse fail?', isStr, lastC, str);
              return null;
            }
          } else {
            quot = c;
            isStr = true;
          }
          break;
        default:
          v += c;
      }
      lastC = c;
    }
    if (key !== '' && v !== '') {
      result[key] = v.trim();
    }

    return result;
  }

  static parseNicosParams(str: string) {
    // 雑なパース
    let result = [], v = '', lastC = '', quot = '';
    for (let i = 0, len = str.length; i < len; i++) {
      let c = str.charAt(i);
      switch (c) {
        case ' ':
        case '　':
          if (quot) {
            v += c;
          } else {
            if (v !== '') {
              result.push(v);
              v = quot = '';
            }
          }
          break;
        case '\'':
        case '"':
          if (v !== '') {
            if (quot !== c) {
              v += c;
            } else {
              if (lastC === '\\') {
                v += c;
              }
              else {
                v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
                result.push(v);
                v = quot = '';
              }
            }
          } else {
            quot = c;
          }
          break;
        case '「':
          if (v !== '') {
            v += c;
          } else {
            quot = c;
          }
          break;
        case '」':
          if (v !== '') {
            if (quot !== '「') {
              v += c;
            } else {
              if (lastC === '\\') {
                v += c;
              }
              else {
                result.push(v);
                v = quot = '';
              }
            }
          } else {
            v += c;
          }
          break;
        default:
          v += c;
      }
      lastC = c;
    }
    if (v !== '') {
      result.push(v.trim());
    }

    return result;
  }

  static parseNicos(text: string): ParsedNicos {
    text = text.trim();
    const text1 = (text || '').split(/[ 　:：]+/)[0]; // eslint-disable-line
    let typeAndParams: TypeAndParams

    switch (text1) {
      case '@デフォルト':
      case '＠デフォルト':
        typeAndParams = {type: 'DEFAULT'};
        break;
      case '@逆':
      case '＠逆':
        typeAndParams = {type: 'REVERSE', params: NicoScriptParser.parse逆(text)};
        break;
      case '@ジャンプ':
      case '＠ジャンプ': {
        const params = NicoScriptParser.parseジャンプ(text);
        typeAndParams = { params, type: params.type }
      }
        break;
      case '@ジャンプマーカー':
      case '＠ジャンプマーカー':
        typeAndParams = {type: 'MARKER', params: NicoScriptParser.parseジャンプマーカー(text)};
        break;
      default:
        if (text.indexOf('@置換') === 0 || text.indexOf('＠置換') === 0) {
          typeAndParams = {type: 'REPLACE', params: NicoScriptParser.parse置換(text)};
        } else {
          typeAndParams = {
            type: 'PIPE',
            params: NicoScriptParser.parseNiwango(NicoScriptParser.splitLines(text))
          }
        }
    }

    const id = NicoScriptParser.parseId;
    return {id, ...typeAndParams};
  }

  static splitLines(str: string) {
    let result = [], v = '', lastC = '', isStr = false, quot = '';
    for (let i = 0, len = str.length; i < len; i++) {
      let c = str.charAt(i);
      switch (c) {
        case ';':
          if (isStr) {
            v += c;
          }
          else {
            result.push(v.trim());
            v = '';
          }
          break;
        case ' ':
          if (v !== '') {
            v += c;
          }
          break;
        case '\'':
        case '"':
          if (isStr) {
            if (quot === c) {
              if (lastC !== '\\') {
                isStr = false;
              }
            }
            v += c;
          } else {
            quot = c;
            isStr = true;
            v += c;
          }
          break;
        default:
          v += c;
      }
      lastC = c;
    }
    if (v !== '') {
      result.push(v.trim());
    }

    return result;
  }


  static parseReplace(str: string) {
    const result = NicoScriptParser.parseParams(str);

    if (!result) {
      return null;
    }
    return {
      src: result.src,
      dest: result.dest || '',
      fill: result.fill === 'true' ? true : false,
      target: result.target || 'user',
      partial: result.partial === 'false' ? false : true
    };
  }


  static parseSeek(str: string) {
    const result = NicoScriptParser.parseParams(str);
    if (!result) {
      return null;
    }
    return {
      time: result.vpos
    };
  }


  static parse置換(str: string) {
    const tmp = NicoScriptParser.parseNicosParams(str);
    //＠置換 キーワード 置換後 置換範囲 投コメ 一致条件
    //＠置換 "И"       "██" 単       投コメ

    // 投稿者コメントを含めるかどうか
    let target = 'user'; // '投コメ'
    if (tmp[4] === '含む' || tmp[4] === '全') { // マニュアルにはないが '全' もあるらしい
      target = 'owner user';
    } else if (tmp[4] === '投コメ') {
      target = 'owner';
    }
    return {
      src: tmp[1],
      dest: tmp[2] || '',
      fill: tmp[3] === '全' ? true : false,          //全体を置き換えるかどうか
      target, //(tmp[4] === '含む' || tmp[4] === '投コメ')     ? 'owner user' : 'user',
      partial: tmp[5] === '完全一致' ? false : true           // 完全一致のみを見るかどうか
    };
  }


  static parse逆(str: string) {
    const tmp = NicoScriptParser.parseNicosParams(str);
    /* eslint-disable */
    //＠逆　投コメ
    /* eslint-enable */
    const target = (tmp[1] || '').trim();
    //＠置換キーワード置換後置換範囲投コメ一致条件
    return {
      target: (target === 'コメ' || target === '投コメ') ? target : '全',
    };
  }


  static parseジャンプ(str: string) {
    //＠ジャンプ ジャンプ先 メッセージ 再生開始位置 戻り秒数 戻りメッセージ
    const tmp = NicoScriptParser.parseNicosParams(str);
    const target = tmp[1] || '';
    let type: "JUMP" | "SEEK" | "SEEK_MARKER" = 'JUMP';
    let time = 0;
    let m;
    if ((m = /^#(\d+):(\d+)$/.exec(target)) !== null) {
      type = 'SEEK';
      time = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) * 1;
    } else if ((m = /^#(\d+):(\d+\.\d+)$/.exec(target)) !== null) {
      type = 'SEEK';
      time = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) * 1;
    } else if ((m = /^(#|＃)(.+)/.exec(target)) !== null) {
      type = 'SEEK_MARKER';
      time = parseFloat(m[2]);
    }
    return {target, type, time};
  }


  static parseジャンプマーカー(str: string) {
    const tmp = NicoScriptParser.parseNicosParams(str);
    const name = tmp[0].split(/[:： 　]/)[1]; // eslint-disable-line
    return {name};
  }

}

function runtimeKeyofByKeyInObj<Obj extends {[key: string | number | symbol]: unknown}>(key: string | number | symbol, obj: Obj): key is keyof Obj {
  return key in obj
}

class NicoScripter extends Emitter<{
  command: ["nicosSeek", number],
}> {
  _hasSort = false;
  _list: NicoChat[] = [];
  _eventScript: {p: ParsedNicos, nicos: NicoChat}[] = [];
  _nextVideo: string | null = null;
  _marker: {[key: number | string]: number} = {};
  _inviewEvents: {[key: string]: boolean | undefined} = {};
  _currentTime = 0;
  _eventId = 0;

  constructor() {
    super();
    this.reset();
  }

  reset() {
    this._hasSort = false;
    this._list = [];
    this._eventScript = [];
    this._nextVideo = null;
    this._marker = {};
    this._inviewEvents = {};
    this._currentTime = 0;
    this._eventId = 0;
  }

  add(nicoChat: NicoChat) {
    this._hasSort = false;
    this._list.push(nicoChat);
  }

  get isEmpty() {
    return this._list.length === 0;
  }

  getNextVideo() {
    return this._nextVideo || '';
  }

  getEventScript() {
    return this._eventScript || [];
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(v) {
    this._currentTime = v;
    if (this._eventScript.length > 0) {
      this._updateInviewEvents();
    }
  }

  _sort() {
    if (this._hasSort) {
      return;
    }
    const list = this._list.concat().sort((a, b) => {
      const av = a.vpos, bv = b.vpos;
      if (av !== bv) {
        return av - bv;
      } else {
        return a.no < b.no ? -1 : 1;
      }
    });
    this._list = list;
    this._hasSort = true;
  }

  _updateInviewEvents() {
    const ct = this._currentTime;
    this._eventScript.forEach(({p, nicos}) => {
      const beginTime = nicos.vpos / 100;
      const endTime = beginTime + nicos.duration;
      if (beginTime > ct || endTime < ct) {
        delete this._inviewEvents[p.id];
        return;
      }
      if (this._inviewEvents[p.id]) {
        return;
      }
      this._inviewEvents[p.id] = true;
      let diff = nicos.vpos / 100 - ct;
      diff = Math.min(1, Math.abs(diff)) * (diff / Math.abs(diff));
      switch (p.type) {
        case 'SEEK':
          this.emit('command', 'nicosSeek', Math.max(0, p.params.time * 1 + diff));
          break;
        case 'SEEK_MARKER': {
          let time = this._marker[p.params.time] || 0;
          this.emit('command', 'nicosSeek', Math.max(0, time + diff));
          break;
        }
      }
    });
  }

  apply(group: NicoChat[] | NicoChatGroup) {
    this._sort();
    const assigned: {[key: number]: boolean} = {};

    // どうせ全動画の1%も使われていないので
    // 最適化もへったくれもない
    const eventFunc: {[key in keyof NicoScriptTypeToParams]?: (p: ParsedNicos & { params: NicoScriptTypeToParams[key] }, nicos: NicoChat) => void} = {
      'JUMP': (p, nicos) => {
        console.log('@ジャンプ: ', p, nicos);
        const target = p.params.target;
        if (/^([a-z]{2}|)[0-9]+$/.test(target)) {
          this._nextVideo = target;
        }
      },
      'SEEK': (p, nicos) => {
        if (assigned[p.id]) {
          return;
        }
        assigned[p.id] = true;
        this._eventScript.push({p, nicos});
      },
      'SEEK_MARKER': (p, nicos) => {
        if (assigned[p.id]) {
          return;
        }
        assigned[p.id] = true;

        console.log('SEEK_MARKER: ', p, nicos);
        this._eventScript.push({p, nicos});
      },
      'MARKER': (p, nicos) => {
        console.log('@ジャンプマーカー: ', p, nicos);
        this._marker[p.params.name] = nicos.vpos / 100;
      }
    };

    const applyFunc: {[key in keyof NicoScriptTypeToParams]?: (nc: NicoChat, nicos: NicoChat, params: NicoScriptTypeToParams[key]) => void} = {
      DEFAULT(nicoChat: NicoChat, nicos) {
        const nicosColor = nicos.color;
        const hasColor = nicoChat.hasColorCommand;
        if (nicosColor && !hasColor) {
          nicoChat.color = nicosColor;
        }

        const nicosSize = nicos.size;
        const hasSize = nicoChat.hasSizeCommand;
        if (nicosSize && !hasSize) {
          nicoChat.size = nicosSize;
        }

        const nicosType = nicos.type;
        const hasType = nicoChat.hasTypeCommand;
        if (nicosType && !hasType) {
          nicoChat.type = nicosType;
        }

      },
      COLOR(nicoChat: NicoChat, nicos, params) {
        const hasColor = nicoChat.hasColorCommand;
        if (!hasColor) {
          nicoChat.color = params.color;
        }
      },
      REVERSE(nicoChat: NicoChat, nicos, params) {
        if (params.target === '全') {
          nicoChat.isReverse = true;
        } else if (params.target === '投コメ') {
          if (nicoChat.fork > 0) {
            nicoChat.isReverse = true;
          }
        } else if (params.target === 'コメ') {
          if (nicoChat.fork === 0) {
            nicoChat.isReverse = true;
          }
        }
      },
      REPLACE(nicoChat: NicoChat, nicos, params) {
        if (!params) {
          return;
        }
        // if (nicoChat.isNicoScript()) { return; }
        if (nicoChat.fork > 0 && (params.target || '').indexOf('owner') < 0) {
          return;
        }
        if (nicoChat.fork < 1 && params.target === 'owner') {
          return;
        }

        let isMatch = false;
        let text = nicoChat.text;

        if (params.partial === true) {
          isMatch = text.indexOf(params.src) >= 0;
        } else {
          isMatch = text === params.src;
        }
        if (!isMatch) {
          return;
        }

        if (params.fill === true) {
          text = params.dest;
        } else {// ＠置換 "~" "\n" 単 全
          const reg = new RegExp(textUtil.escapeRegs(params.src), 'g');
          text = text.replace(reg, params.dest);
        }
        nicoChat.text = text;

        const nicosColor = nicos.color;
        const hasColor = nicoChat.hasColorCommand;
        if (nicosColor && !hasColor) {
          nicoChat.color = nicosColor;
        }

        const nicosSize = nicos.size;
        const hasSize = nicoChat.hasSizeCommand;
        if (nicosSize && !hasSize) {
          nicoChat.size = nicosSize;
        }

        const nicosType = nicos.type;
        const hasType = nicoChat.hasTypeCommand;
        if (nicosType && !hasType) {
          nicoChat.type = nicosType;
        }

      },
      PIPE(nicoChat: NicoChat, nicos, lines) {
        lines.forEach(line => {
          const f = applyFunc[line.type];
          if (f) {
            f(nicoChat, nicos, line.params as any);
          }
        });
      }
    };


    this._list.forEach(nicos => {
      const p = NicoScriptParser.parseNicos(nicos.text);
      if (!p) {
        return;
      }
      if (!nicos.hasDurationSet) {
        nicos.duration = 99999;
      }

      const ev = eventFunc[p.type]
      if (ev != null) {
        // TypeScript コンパイラが複雑すぎると文句を言うので any にして誤魔化す
        const eev = ev as any
        eev(p, nicos)
        return
      } else if (p.type === 'PIPE') {
        p.params.forEach(line => {
          const type = line.type;
          const ev = eventFunc[line.type];
          if (ev != null) {
            return ev(line as any, nicos);
          }
        });
      }


      const func = applyFunc[p.type] as (nicoChat: NicoChat, nicos: NicoChat, params: NicoScriptTypeToParams[keyof NicoScriptTypeToParams]) => void;
      if (!func) {
        return;
      }

      const beginTime = nicos.beginTime;
      const endTime = beginTime + nicos.duration;

      ("members" in group ? group.members : group).forEach(nicoChat => {
        if (nicoChat.isNicoScript) {
          return;
        }
        const ct = nicoChat.beginTime;

        if (beginTime > ct || endTime < ct) {
          return;
        }
        func(nicoChat, nicos, p.params as any);
      });
    });
  }
}


//===END===

export {
  NicoScripter,
  NicoScriptParser
};
/* eslint-disable */
//＠置換　U　「( ˘ω˘)ｽﾔｧ」 全
/* eslint-enable */

