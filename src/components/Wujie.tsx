import { FC, useEffect, useRef } from "react";
import { startApp, startOptions } from "wujie";

const Wujie: FC<WujieProps> = (props) => {
  const myRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const startAppFunc = async (el: HTMLDivElement) => {
      const destroy = await startApp({
        ...props,
        el,
      });

      // 目的就是为了验证非 `fiber` 模式下没有返回
      console.log(destroy);
    };
    myRef.current && startAppFunc(myRef.current);
  }, [myRef, props]);

  return <div className="container" ref={myRef} />;
};

export interface WujieProps extends Omit<startOptions, "el"> {}

export default Wujie;
