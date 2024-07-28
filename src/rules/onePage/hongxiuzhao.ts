import { mkRuleClass } from "./template";
import { rm } from "../../lib/dom";
import { table } from "../lib/hongxiuzhao";
import { getHtmlDomWithRetry, } from "../../lib/http";
import { log } from "../../log";
import { concurrencyRun } from "../../lib/misc";

export const hongxiuzhao = () => {
  const getChapterId = (url: string) => {
    const chapterIdStrArr = url.split('\/');
    const chapterIdStr = chapterIdStrArr[chapterIdStrArr.length - 1];
    const chapterId = chapterIdStr.substring(0, chapterIdStr.length - 5);
    return chapterId;
  }

  const getNextPage = async (chapterId: string, nextPage: number): Promise<number> => {
    const contentPageUrl = `${document.location.origin}/${chapterId}_${nextPage}.html`;
    const doc = await getHtmlDomWithRetry(contentPageUrl, document.characterSet) as Document;

    const a = doc.querySelector(
      ".pager > a:nth-last-child(1)"
    ) as HTMLAnchorElement;
    const reg = new RegExp(chapterId + '_' + '(\\d+)');
    const theNextPage = reg.exec(a.href)?.[1];
    if (!theNextPage) {
      return nextPage - 1;
    }
    const lastPage = await getNextPage(chapterId, Number(theNextPage));
    return lastPage;
  }

  return mkRuleClass({
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
    additionalMetadatePatch: (additionalMetadate) => {
      additionalMetadate.tags = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(".tags > a")
      ).map((a) => a.innerText.trim());
      return additionalMetadate;
    },
    getAList: async () => {
      const chapterUrls = Array.from(document.querySelectorAll(".m-chapters li > a") as unknown as HTMLAnchorElement[]);
      const obj: any = {};
      chapterUrls.forEach((it) => {
        const chapterId = getChapterId(it.href);
        obj[chapterId] = {
          title: it.innerText,
        };
      })

      const allUrls: string[] = []

      await concurrencyRun(chapterUrls, 10, async (it) => {
        if (!it) { return; }

        const chapterUrl = it.href;

        return getHtmlDomWithRetry(chapterUrl, document.characterSet).then(async doc => {
          if (!doc) {
            return;
          }
          const chapterId = getChapterId(chapterUrl);
          const a = doc.querySelector(
            ".pager > a:nth-last-child(1)"
          ) as HTMLAnchorElement;
          log.info(`[ChapterParse]章节${obj[chapterId].title}下一页链接：` + (a ? a.href : 'none'));
          const reg = new RegExp(chapterId + '_' + '(\\d+)');
          const nextPage = reg.exec(a.href)?.[1];

          if (!nextPage) {
            log.info(`[ChapterParse]章节${obj[chapterId].title}没有多页！`);
            return;
          }

          log.info(`[ChapterParse]章节${obj[chapterId].title}有多页！`);

          const maxNumber = await getNextPage(chapterId, Number(nextPage));
          obj[chapterId].maxNumber = maxNumber;
        });
      });

      chapterUrls.forEach((it) => {
        const chapterId = getChapterId(it.href);
        const chapterItem = obj[chapterId];

        allUrls.push(it.href);

        for (let j = 2; j <= chapterItem.maxNumber; j++) {
          const url = `${document.location.origin}/${chapterId}_${j}.html`;
          allUrls.push(url);
        }
      })

      log.info("[ChapterParse]所有章节链接：\n" + JSON.stringify(allUrls));

      return allUrls.map(it => {
        const chapterId = getChapterId(it).split('_')[0];
        const reg = new RegExp(chapterId + '_' + '(\\d+)');
        const theNextPage = reg.exec(it)?.[1];

        return {
          href: it,
          innerText: obj[chapterId].title + (theNextPage ? ('-' + theNextPage) : '')
        }
      }) as unknown as NodeListOf<Element>
    },
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

