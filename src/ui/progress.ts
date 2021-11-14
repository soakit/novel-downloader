import { createEl, createStyle } from "../lib/createEl";

import type * as _vue from "vue";
declare const Vue: typeof _vue;
import "./injectVue";

const progressStyle = `#nd-progress {
    position: fixed;
    bottom: 8%;
    right: 3%;
    z-index: 2147483647;
    border-style: none;
    text-align: center;
    vertical-align: baseline;
    background-color: rgba(210, 210, 210, 0.2);
    padding: 6px;
    border-radius: 12px;
}
#chapter-progress{
    --color:green;
    --position:0%;
    width:200px;
    height:10px;
    border-radius:30px;
    background-color:#ccc;
    background-image:radial-gradient(closest-side circle at var(--position),var(--color),var(--color) 100%,transparent),linear-gradient(var(--color),var(--color));
    background-image:-webkit-radial-gradient(var(--position),circle closest-side,var(--color),var(--color) 100%,transparent),-webkit-linear-gradient(var(--color),var(--color));
    background-size:100% ,var(--position);
    background-repeat: no-repeat;
}
#zip-progress{
    --color:yellow;
    --position:0%;
    width:200px;
    height:10px;
    border-radius:30px;
    background-color:#ccc;
    background-image:radial-gradient(closest-side circle at var(--position),var(--color),var(--color) 100%,transparent),linear-gradient(var(--color),var(--color));
    background-image:-webkit-radial-gradient(var(--position),circle closest-side,var(--color),var(--color) 100%,transparent),-webkit-linear-gradient(var(--color),var(--color));
    background-size:100% ,var(--position);
    background-repeat: no-repeat;
    margin-top: 5px;
}`;
createStyle(progressStyle);

export const el = createEl(`<div><div id="nd-progress" v-if="ntProgressSeen">
<div v-if="chapterProgressSeen" 
    id='chapter-progress' 
    v-bind:style="{'--position': chapterPercent+'%'}" 
    v-bind:title="chapterProgressTitle"></div>
<div v-if="zipProgressSeen" 
    id='zip-progress' 
    title="ZIP" 
    v-bind:style="{'--position': zipPercent+'%'}"></div>
</div></div>`);

export interface progressVM extends _vue.ComponentPublicInstance {
  totalChapterNumber: number;
  finishedChapterNumber: number;
  zipPercent: number;
  reset: () => void;
}
export const vm = Vue.createApp({
  data() {
    return {
      totalChapterNumber: 0,
      finishedChapterNumber: 0,
      zipPercent: 0,
    };
  },
  computed: {
    chapterPercent() {
      if (this.totalChapterNumber !== 0 && this.finishedChapterNumber !== 0) {
        return (this.finishedChapterNumber / this.totalChapterNumber) * 100;
      } else {
        return 0;
      }
    },
    chapterProgressSeen() {
      return this.chapterPercent !== 0;
    },
    zipProgressSeen() {
      return this.zipPercent !== 0;
    },
    ntProgressSeen() {
      if (this.chapterProgressSeen || this.zipProgressSeen) {
        return true;
      } else {
        return false;
      }
    },
    chapterProgressTitle() {
      return `章节：${this.finishedChapterNumber}/${this.totalChapterNumber}, ${this.chapterPercent}`;
    },
  },
  methods: {
    reset() {
      this.totalChapterNumber = 0;
      this.finishedChapterNumber = 0;
      this.zipPercent = 0;
    },
  },
}).mount(el);
