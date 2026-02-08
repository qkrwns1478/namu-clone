import React from "react";

// CSS 스타일 문자열 파싱
export const parseCssStyle = (styleString: string): React.CSSProperties => {
  const style: any = {};
  const rules = styleString.split(";");

  rules.forEach((rule) => {
    const parts = rule.split(":");
    if (parts.length < 2) return;

    const key = parts[0].trim().replace(/-(\w)/g, (_, c) => c.toUpperCase());
    const value = parts.slice(1).join(":").trim();

    if (key && value) {
      style[key] = value;
    }
  });

  return style;
};

// 표 셀 분리 (|| 구분자 처리)
export function splitCells(text: string): string[] {
    const res: string[] = [];
    let buf = "";
    let depth = 0;

    for (let i = 0; i < text.length; i++) {
      if (text.startsWith("{{{", i)) {
        depth++;
        buf += "{{{";
        i += 2;
      } else if (text.startsWith("}}}", i)) {
        depth--;
        buf += "}}}";
        i += 2;
      } else if (depth === 0 && text.startsWith("||", i)) {
        res.push(buf);
        buf = "";
        i++;
      } else {
        buf += text[i];
      }
    }
    res.push(buf);
    return res;
  }

// 색상 값 파싱 헬퍼
export function parseColorValue(val: string) {
  if (!val) return "";
  if (val.includes(",")) return val.split(",")[0].trim();
  return val.trim();
}

// 셀 속성 파싱 (<bgcolor=...> 등)
export function parseCellAttributes(rawContent: string) {
  let content = rawContent;
  let style: React.CSSProperties = {};
  let tableStyle: React.CSSProperties = {};
  let rowStyle: React.CSSProperties = {};
  let colStyle: React.CSSProperties = {};
  let colSpan = 1;
  let rowSpan = 1;

  const formatSize = (val: string) => {
    if (!val) return undefined;
    const trimVal = val.trim();
    return /^\d+$/.test(trimVal) ? `${trimVal}px` : trimVal;
  };

  while (true) {
    const trimmedCheck = content.trimStart();
    if (!trimmedCheck.startsWith("<")) break;
    const endIdx = trimmedCheck.indexOf(">");
    if (endIdx === -1) break;
    const tagContent = trimmedCheck.slice(1, endIdx);
    const lowerInner = tagContent.toLowerCase().trim();
    let handled = false;

    if (lowerInner.startsWith("tablebordercolor=")) {
      const v = parseColorValue(tagContent.split("=")[1]);
      tableStyle.border = `2px solid ${v}`;
      handled = true;
    } else if (lowerInner.startsWith("tablebgcolor=")) {
      const v = parseColorValue(tagContent.split("=")[1]);
      tableStyle.backgroundColor = v;
      style.backgroundColor = v;
      handled = true;
    } else if (lowerInner.startsWith("tablealign=")) {
      const v = lowerInner.split("=")[1];
      if (v === "right") {
        tableStyle.float = "right";
        tableStyle.marginLeft = "10px";
      } else if (v === "left") {
        tableStyle.float = "left";
        tableStyle.marginRight = "10px";
      } else if (v === "center") {
        tableStyle.marginLeft = "auto";
        tableStyle.marginRight = "auto";
        tableStyle.float = "none";
      }
      handled = true;
    } else if (lowerInner.startsWith("tablewidth=")) {
      tableStyle.width = formatSize(tagContent.split("=")[1]);
      handled = true;
    } else if (lowerInner.startsWith("table")) {
      const optsStr = tagContent.substring(5).trim();
      const opts = optsStr.split(/\s+/);
      opts.forEach((opt) => {
        const parts = opt.split("=");
        if (parts.length === 2) {
          const k = parts[0].toLowerCase();
          const v = parseColorValue(parts[1]);
          if (k === "bordercolor") tableStyle.borderColor = v;
          else if (k === "bgcolor") {
            tableStyle.backgroundColor = v;
            style.backgroundColor = v;
          } else if (k === "width") tableStyle.width = formatSize(v);
          else if (k === "align") {
            if (v === "right") {
              tableStyle.float = "right";
              tableStyle.marginLeft = "10px";
            } else if (v === "left") {
              tableStyle.float = "left";
              tableStyle.marginRight = "10px";
            } else if (v === "center") {
              tableStyle.marginLeft = "auto";
              tableStyle.marginRight = "auto";
            }
          }
        }
      });
      handled = true;
    } else if (lowerInner.startsWith("rowbgcolor=")) {
      rowStyle.backgroundColor = parseColorValue(tagContent.split("=")[1]);
      handled = true;
    } else if (lowerInner.startsWith("rowcolor=")) {
      rowStyle.color = parseColorValue(tagContent.split("=")[1]);
      handled = true;
    } else if (lowerInner.startsWith("colbgcolor=")) {
      colStyle.backgroundColor = parseColorValue(tagContent.split("=")[1]);
      handled = true;
    } else if (lowerInner.startsWith("colcolor=")) {
      colStyle.color = parseColorValue(tagContent.split("=")[1]);
      handled = true;
    } else if (lowerInner === "nopad") {
      style.padding = "0px";
      handled = true;
    } else if (lowerInner.startsWith("bgcolor=")) {
      style.backgroundColor = parseColorValue(tagContent.split("=")[1]);
      handled = true;
    } else if (tagContent.startsWith("#")) {
      style.backgroundColor = parseColorValue(tagContent);
      handled = true;
    } else if (lowerInner.startsWith("color=")) {
      style.color = parseColorValue(tagContent.split("=")[1]);
      handled = true;
    } else if (tagContent.startsWith("^|")) {
      style.verticalAlign = "top";
      const val = parseInt(tagContent.slice(2));
      if (!isNaN(val)) rowSpan = val;
      handled = true;
    } else if (tagContent.startsWith("v|")) {
      style.verticalAlign = "bottom";
      const val = parseInt(tagContent.slice(2));
      if (!isNaN(val)) rowSpan = val;
      handled = true;
    } else if (tagContent.startsWith("|")) {
      style.verticalAlign = "middle";
      const val = parseInt(tagContent.slice(1));
      if (!isNaN(val)) {
        rowSpan = val;
      }
      handled = true;
    } else if (tagContent === "(") {
      style.textAlign = "left";
      handled = true;
    } else if (tagContent === ":") {
      style.textAlign = "center";
      handled = true;
    } else if (tagContent === ")") {
      style.textAlign = "right";
      handled = true;
    } else if (tagContent.startsWith("-")) {
      const val = parseInt(tagContent.slice(1));
      if (!isNaN(val)) {
        colSpan = val;
        handled = true;
      }
    } else if (lowerInner.startsWith("width=")) {
      style.width = formatSize(tagContent.split("=")[1]);
      handled = true;
    } else if (lowerInner.startsWith("height=")) {
      style.height = formatSize(tagContent.split("=")[1]);
      handled = true;
    }

    if (handled) {
      const tagString = "<" + tagContent + ">";
      const tagIndex = content.indexOf(tagString);
      if (tagIndex !== -1) content = content.slice(tagIndex + tagString.length);
      else break;
    } else break;
  }

  if (!style.textAlign) {
    if (content.startsWith(" ") && content.endsWith(" ")) style.textAlign = "center";
    else if (content.startsWith(" ") && !content.endsWith(" ")) style.textAlign = "right";
    else if (!content.startsWith(" ") && content.endsWith(" ")) style.textAlign = "left";
  }
  content = content.trim();
  return { style, tableStyle, rowStyle, colStyle, colSpan, rowSpan, content };
}