import Wujie from "../components/Wujie";

export default function BeforePage() {
  return (
    <Wujie
      alive={true}
      name="before-react-project"
      url="http://localhost:10000"
      plugins={[
        {
          jsBeforeLoaders: [
            {
              async: true,
              src: "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js",
            },
          ],
        },
      ]}
    />
  );
}
