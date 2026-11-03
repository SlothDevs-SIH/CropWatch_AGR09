import { Fragment } from "react";

/** Splits a line into words, each in a mask so it can rise into view. Animate the ".lp-w" children. */
export default function SplitText({ text, className = "", as: Tag = "span" }) {
  return (
    <Tag className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          <span className="lp-mask" aria-hidden="true"><span className="lp-w">{w}</span></span>{" "}
        </Fragment>
      ))}
    </Tag>
  );
}
