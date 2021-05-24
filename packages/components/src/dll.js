import * as lit from 'lit-html';
import {repeat} from 'lit-html/directives/repeat';
import {classMap} from 'lit-html/directives/class-map';

const dll = { directives: {}};
//===BEGIN===
dll.lit = lit;
dll.directives.repeat = repeat;
dll.directives.classMap = classMap;
//===END===
export {dll};