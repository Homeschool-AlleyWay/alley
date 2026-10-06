import { drawChar } from "../src/hall3d/rig";
import { makePlan, draw, record } from "../src/news/video";
import { studio } from "../src/news/studio";
import { classify, TOPIC_LABEL } from "../src/news/topics";
import { findPlace } from "../src/news/gazetteer";
(window as any).__drawChar = drawChar;
(window as any).__newsVideo = { makePlan, draw, record, studio, classify, TOPIC_LABEL, findPlace };
