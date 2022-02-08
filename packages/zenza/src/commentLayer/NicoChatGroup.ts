import {Emitter} from '../../../lib/src/Emitter';
import { NicoChat } from './NicoChat';
import {NicoChatFilter, SHARED_NG_LEVEL_TYPE} from './NicoChatFilter';

//===BEGIN===

export type NicoChatGroupParams = {
  nicoChatFilter: NicoChatFilter,
}
class NicoChatGroup extends Emitter<{
  addChat: [NicoChat],
  addChatArray: [NicoChat[]],
  change: [{
    chat: NicoChat | null,
    group: NicoChatGroup,
  }],
}> {
  _type: unknown
  _nicoChatFilter!: NicoChatFilter
  _members: NicoChat[] = []
  _filteredMembers: NicoChat[] = []
  _currentTime?: number
  _sharedNgLevel?: SHARED_NG_LEVEL_TYPE
  
  constructor(...args: Parameters<NicoChatGroup["initialize"]>) {
    super();
    this.initialize(...args);
  }

  initialize(type: unknown, params: NicoChatGroupParams) {
    this._type = type;

    this._nicoChatFilter = params.nicoChatFilter;
    this._nicoChatFilter.on('change', this._onFilterChange.bind(this));

    this.reset();
  }
  reset() {
    this._members = [];
    this._filteredMembers = [];
  }
  addChatArray(nicoChatArray: NicoChat[]) {
    let members = this._members;
    let newMembers: NicoChat[] = [];
    for (const nicoChat of nicoChatArray) {
      newMembers.push(nicoChat);
      members.push(nicoChat);
      nicoChat.group = this;
    }

    newMembers = this._nicoChatFilter.applyFilter(nicoChatArray);
    if (newMembers.length > 0) {
      this._filteredMembers = this._filteredMembers.concat(newMembers);
      this.emit('addChatArray', newMembers);
    }
  }
  addChat(nicoChat: NicoChat) {
    this._members.push(nicoChat);
    nicoChat.group = this;

    if (this._nicoChatFilter.isSafe(nicoChat)) {
      this._filteredMembers.push(nicoChat);
      this.emit('addChat', nicoChat);
    }
  }
  get type() {return this._type;}
  get members() {
    if (this._filteredMembers.length > 0) {
      return this._filteredMembers;
    }
    return this._filteredMembers = this._nicoChatFilter.applyFilter(this._members);
  }
  get nonFilteredMembers() { return this._members; }
  onChange(e: NicoChat | null) {
    console.log('NicoChatGroup.onChange: ', e);
    this._filteredMembers = [];
    this.emit('change', {
      chat: e,
      group: this
    });
  }
  _onFilterChange() {
    this._filteredMembers = [];
    this.onChange(null);
  }
  get currentTime() {return this._currentTime;}
  set currentTime(sec) {
    this._currentTime = sec;
    // let m = this._members;
    // for (let i = 0, len = m.length; i < len; i++) {
    //   m[i].currentTime = sec;
    // }
  }
  setSharedNgLevel(level: SHARED_NG_LEVEL_TYPE) {
    if (NicoChatFilter.SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
      this._sharedNgLevel = level;
      this.onChange(null);
    }
  }
  includes(nicoChat: NicoChat) {
    const uno = nicoChat.uniqNo;
    return this._members.find(m => m.uniqNo === uno);
  }
}

//===END===

export {NicoChatGroup};