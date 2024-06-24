import { FC, useEffect, useRef } from "react";
import { startApp, startOptions } from "wujie";

const Wujie: FC<WujieProps> = (props) => {
  const myRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const startAppFunc = async (el: HTMLDivElement) => {
      await startApp({
        ...props,
        el,
      });
    };
    myRef.current && startAppFunc(myRef.current);
  }, [myRef, props]);

  return <div ref={myRef} />;
};

export interface WujieProps
  extends Pick<startOptions, "name" | "sync" | "url"> {}

export default Wujie;
