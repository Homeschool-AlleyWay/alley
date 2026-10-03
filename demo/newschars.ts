import { drawChar } from "../src/hall3d/rig";
import { makePlan, draw, record } from "../src/news/video";
import { classify, TOPIC_LABEL } from "../src/news/topics";
import { findPlace } from "../src/news/gazetteer";
(window as any).__drawChar = drawChar;
(window as any).__newsVideo = { makePlan, draw, record, classify, TOPIC_LABEL, findPlace };
