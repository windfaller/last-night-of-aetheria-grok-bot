import './style.css'
import { Game } from './game/game'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('#app missing')

const game = new Game(app)
game.boot()
