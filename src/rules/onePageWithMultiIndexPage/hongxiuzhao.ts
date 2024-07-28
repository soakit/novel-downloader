import { mkRuleClass } from "./template";
import { rm } from "../../lib/dom";
import { table } from "../lib/hongxiuzhao";
import { getHtmlDOM } from "../../lib/http";
import { sleep } from "../../lib/misc";
import { log } from "../../log";

export const hongxiuzhao = () => {
  const getChapterId = (url: string) => {
    const chapterIdStrArr = url.split('\/');
    const chapterIdStr = chapterIdStrArr[chapterIdStrArr.length - 1];
    const chapterId = chapterIdStr.substring(0, chapterIdStr.length - 5);
    return chapterId;
  }

  const getNextPage = async (chapterId: string, nextPage: number): Promise<number> => {
    const contentPageUrl = `${document.location.origin}/${chapterId}_${nextPage}.html`;
    const doc = await getHtmlDOM(contentPageUrl, document.characterSet);

    const a = doc.querySelector(
      ".pager > a:nth-last-child(1)"
    ) as HTMLAnchorElement;
    const reg = new RegExp(chapterId + '_' + '(\\d)');
    const theNextPage = reg.exec(a.href)?.[1];
    if (!theNextPage) {
      return nextPage - 1;
    }
    await sleep(5000);
    const lastPage = await getNextPage(chapterId, Number(theNextPage));
    return lastPage;
  }

  return mkRuleClass({
    concurrencyLimit: 3,
    bookUrl: document.location.href,
    bookname:
      document
        .querySelector<HTMLHeadingElement>(".m-bookdetail div.f-fl > h1")
        ?.innerText.trim() ?? "",
    author:
      document
        .querySelector<HTMLAnchorElement>(".author > a:nth-child(1)")
        ?.innerText.trim() ?? "",
    introDom:
      document.querySelector<HTMLParagraphElement>(".summery") ?? undefined,
    introDomPatch: (dom) => {
      rm("strong", false, dom);
      rm("em", false, dom);
      return dom;
    },
    coverUrl: document.querySelector<HTMLImageElement>(".cover > img")?.src,
    getIndexUrls: async () => {
      const chapterUrls = Array.from(document.querySelectorAll(".m-chapters li > a") as unknown as HTMLAnchorElement[]).map(it => it.href)
      const allUrls: string[] = []
      for (let i = 0; i < chapterUrls.length; i++) {
        const chapterUrl = chapterUrls[i];
        allUrls.push(chapterUrl);

        const doc = await getHtmlDOM(chapterUrl, document.characterSet);
        const chapterId = getChapterId(chapterUrl);
        const a = doc.querySelector(
          ".pager > a:nth-last-child(1)"
        ) as HTMLAnchorElement;
        log.info('[ChapterParse]章节下一页链接：' + (a ? a.href : 'none'));
        const reg = new RegExp(chapterId + '_' + '(\\d)');
        const nextPage = reg.exec(a.href)?.[1];
        await sleep(5000);

        if (!nextPage) {
          log.info('[ChapterParse]这章没有多页！');
          continue;
        }

        log.info('[ChapterParse]这章有多页！');

        const maxNumber = await getNextPage(chapterId, Number(nextPage));

        for (let j = 2; j <= maxNumber; j++) {
          const url = `${document.location.origin}/${chapterId}_${j}.html`;
          allUrls.push(url);
        }
      }

      log.info("[ChapterParse]所有章节链接：\n" + JSON.stringify(allUrls));
      return allUrls;
    },
    additionalMetadatePatch: (additionalMetadate) => {
      additionalMetadate.tags = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(".tags > a")
      ).map((a) => a.innerText.trim());
      return additionalMetadate;
    },
    getAList: (doc) => doc.querySelectorAll(".m-chapters li > a"),
    getContent: (doc) => doc.querySelector(".article-content"),
    contentPatch: (content) => {
      rm("mark", true, content);
      rm("h1", true, content);
      rm("ins", true, content);
      rm("script", true, content);
      rm("p[style]", true, content);
      rm('a[href="https://hongxiuzh.com"]', true, content);

      for (const k in table) {
        content.innerHTML = content.innerHTML.replaceAll(k, table[k]);
      }
      return content;
    },
  });
}

