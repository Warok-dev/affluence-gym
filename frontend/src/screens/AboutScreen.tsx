import { BackIcon } from "../components/icons";
import { useT } from "../i18n";
import { ROUTES } from "../router";

const SOURCE_URL = "https://github.com/Warok-dev/affluence-gym";

/** What the app is, where its numbers come from, and exactly what is kept where. */
export function AboutScreen() {
  const t = useT();
  return (
    <div className="workouts about">
      <a className="text-button back-link" href={`#${ROUTES.occupancy}`}>
        <BackIcon /> {t.tabOccupancy}
      </a>
      <h2 className="section-title">{t.aboutTitle}</h2>
      <p>{t.aboutIntro}</p>

      <section className="block" aria-labelledby="about-numbers">
        <h3 id="about-numbers" className="block-title">
          {t.aboutNumbersTitle}
        </h3>
        <ul className="about-list">
          {t.aboutNumbers.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="block" aria-labelledby="about-data">
        <h3 id="about-data" className="block-title">
          {t.aboutDataTitle}
        </h3>
        <dl className="facts about-facts">
          {t.aboutData.map(([what, where]) => (
            <div key={what}>
              <dt>{what}</dt>
              <dd>{where}</dd>
            </div>
          ))}
        </dl>
        <p className="muted-text">{t.aboutNever}</p>
      </section>

      <section className="block" aria-labelledby="about-code">
        <h3 id="about-code" className="block-title">
          {t.aboutCodeTitle}
        </h3>
        <p>
          {t.aboutCode}{" "}
          <a className="inline-link" href={SOURCE_URL} rel="noopener noreferrer" target="_blank">
            {t.aboutCodeLink}
          </a>
        </p>
      </section>
    </div>
  );
}
