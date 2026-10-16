/** Field-report toolkit for the plain-JS pages (newsdesk.html, news2d.html): cap, audience gate, filter, store, script generator and the papercut film renderer. */
import * as FR from "../src/news/fieldreports";
import { generateScript, inferSetting, inferSubject, inferAction, SETTINGS, SUBJECTS, ACTIONS } from "../src/news/scenegen";
import { drawFilm, filmDuration, sceneAt } from "../src/news/papercut";
import { Broadcast } from "../src/news/broadcast";
import { createNewsTV } from "../src/news/tv";
(window as any).__fieldReports = { ...FR, generateScript, inferSetting, inferSubject, inferAction, SETTINGS, SUBJECTS, ACTIONS, drawFilm, filmDuration, sceneAt, Broadcast, createNewsTV };
