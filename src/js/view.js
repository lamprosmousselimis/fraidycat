import { getIndexById } from './util'
import { h } from 'hyperapp'
import { Link, Route, Switch } from '@kickscondor/router'
import globe from '../images/globe.svg'
const house = "\u{1f3e0}"
import images from '../images/*.png'
const url = require('url')

import u from 'umbrellajs'
import sparkline from '@fnando/sparkline'

const Importances = [
  [0,   'Real-time'],
  [1,   'Daily'],
  [7,   'Weekly'],
  [30,  'Monthly'],
  [365, 'Year']
]

const FollowForm = (follow, isNew) => (_, {follows}) =>
  <form class="follow" onsubmit={e => e.preventDefault()}>
    {isNew &&
      <div>
        <label for="url">URL</label>
        <input type="text" id="url" name="url" value={follow.url} autocorrect="off" autocapitalize="none"
          oninput={e => follow.url = e.target.value} />
      </div>}

    <div>
      <label for="username">Importance</label> 
      <select id="username" name="importance" onchange={e => follow.importance = e.target.options[e.target.selectedIndex].value}>
      {Importances.map(imp => 
        <option value={imp[0]} selected={imp[0] == follow.importance}>{imp[1]}</option>)}
      </select>
    </div>

    <div>
      <label for="tags">Tag(s) &mdash; separate with spaces</label>
      <input type="text" id="tags" value={follow.tags ? follow.tags.join(' ') : ''}
        oninput={e => e.target.value ? (follow.tags = e.target.value.split(/\s+/)) : (delete follow.tags)} />
      <p class="note">(If left blank, tag is assumed to be '&#x1f3e0;'&mdash;the main page tag.)</p>
    </div>

    <div>
      <label for="title">Title</label>
      <input type="text" id="title" value={follow.title}
        oninput={e => follow.title = e.target.value} />
      <p class="note">(Leave empty to use <span>{follow.actualTitle || "the title loaded from the site"}</span>.)</p>
    </div>

    <div>
      <input type="checkbox" id="fetchesContent" onclick={e => follow.fetchesContent = e.target.checked} checked={follow.fetchesContent} />
      <label for="fetchesContent">Read here?</label>
      <p class="note">(Check this to save a copy of complete posts and read them from Fraidycat.)</p>
    </div>

    <button onclick={_ => follows.save(follow)}>Save</button>
    {!isNew && <button class="delete" onclick={_ => follows.remove(follow)}>Delete This</button>}
  </form>

const EditFollow = ({ match }) => ({follows}) => {
  return <div id="edit-feed">
    <h2>Edit</h2>
    <p>URL: {follows.editing.url}</p>
    {FollowForm(follows.editing, false)}
  </div>
}

const EditFollowById = ({ match }) => ({follows}, actions) => {
  let index = getIndexById(follows.all, match.params.id)
  actions.follows.edit(follows.all[index])
}

const AddFollow = ({ match }) => ({follows}) => {
  return <div id="add-feed">
    <h2>Follow</h2>
    <p>What blog, wiki or social account do you want to follow?</p>
    <p class="note"><em>This can also be a Twitter or Instagram feed, a YouTube channel, a subreddit, a Soundcloud.</em></p>
    {FollowForm(follows.editing, true)}
  </div>
}

const AddFeed = () => ({follows}, actions) => {
  let {list, site} = follows.feeds
  return <div id="feed-select">
    <h2>Select a Feed</h2>
    <p>{site.title || site.actualTitle} ({site.url}) has several feeds:</p>
    <ul>
    {list.map(feed =>
      <li><input type="checkbox" onclick={e => feed.selected = e.target.checked} value={feed.href} /> {feed.title}</li>)}
    </ul>
    <button onclick={_ => actions.follows.subscribe(follows.feeds)}>Subscribe</button>
  </div>
}

function timeAgo(from_time, to_time) {
  from_time = Math.floor(from_time / 1000)
  to_time = Math.floor(to_time / 1000)
  let mins = Math.round(Math.abs(to_time - from_time)/60)

  if (mins >= 0 && mins <= 1) 
    return '1m'
  if (mins >= 2 && mins <= 45)
    return mins + 'm'
  if (mins >= 46 && mins <= 90)
    return '1h'
  if (mins >= 91 && mins <= 1440)
    return Math.round(mins / 60) + 'h'
  if (mins >= 1441 && mins <= 2880)
    return '1d'
  if (mins >= 2881 && mins <= 43220)
    return Math.round(mins / 1440) + 'd'
  if (mins >= 43201 && mins <= 86400)
    return '1M'
  if (mins >= 86401 && mins <= 525960)
    return Math.round(mins / 43200) + 'M'
  if (mins >= 525961 && mins <= 1051920)
    return '1Y'
  return Math.round(mins / 525600) + 'Y'
}

function sparkpoints(el, ary, daily) {
  let points = [], len = 60
  if (daily) {
    points = ary.slice(0, 60)
    len = points.length
  } else {
    len = Math.ceil(len / 3)
    for (let i = 0; i < len; i++) {
      let x = i * 3
      points[i] = (ary[x] || 0) + (ary[x + 1] || 0) + (ary[x + 2] || 0)
    }
  }
  if (points.every(x => x == 0))
    len = 0
  el.setAttribute('width', len * 2)
  if (len > 0)
    sparkline(el, points.reverse())
}

function lastPostTime(follow) {
  if (follow.posts) {
    let lastPost = follow.posts[0]
    if (lastPost)
      return lastPost.updatedAt
  }
  return new Date(0)
}

function rewriteUrl(a, base) {
  if (a.href && !a.href.match(/^[a-z]+:\/\//))
    a.href = base + "/" + a.href
  if (a.src && !a.src.match(/^[a-z]+:\/\//))
    a.src = base + "/" + a.src
}

const ViewFollowById = ({ match }) => ({follows}, actions) => {
  let now = new Date()
  let index = getIndexById(follows.all, match.params.id)
  let follow = follows.all[index]
  let posts = actions.follows.getPosts(follow.id, 0, 20)
  return <div id="reader">
    <h1>{follow.title || follow.actualTitle}</h1>
    <ol>{posts && posts.slice(0, 20).map(post => {
      let details = actions.follows.getPostDetails({post, id: follow.id})
      return <li key={post.id}>
        <h2>{details && details.title}</h2>
        <div class="content" innerHTML={details && (details.description || details.content_html || (details.content ? details.content.text : ""))} />
        <div class="meta">{timeAgo(post.updatedAt, now)} ago</div>
      </li>
    })}
    </ol>
    </div>
}

const ListFollow = ({ match }) => ({follows}, actions) => {
  let now = new Date()
  let tag = match.params ? match.params.tag : house
  let query = new URLSearchParams(window.location.search)
  let imp = query.get('importance') || 0
  let tags = {}, imps = {}
  let viewable = follows.all.filter(follow => {
    let ftags = (follow.tags || [house])
    ftags.forEach(k => tags[k] = true)
    let isShown = ftags.includes(tag)
    if (isShown) imps[follow.importance] = true
    return isShown
  }).sort((a, b) => (a.importance - b.importance) || (lastPostTime(b) - lastPostTime(a)))
  let tagTabs = Object.keys(tags).filter(t => t != house).sort()
  tagTabs.unshift(house)

  return <div id="follows">
    <ul id="tags">
    {tagTabs.map(t => <li><Link to={`/tag/${t}`} class={t == tag ? 'active' : null}>{t}</Link></li>)}
    </ul>
    <ul id="imps">
    {Importances.map(sel => (imps[sel[0]] && (sel[0] == imp ? <li class='active'>{sel[1]}</li> : <li><Link to={query.set('importance', sel[0]) || `/tag/${tag}?${query}`}>{sel[1]}</Link></li>)))}
    </ul>
    <ol>{viewable.map(follow => {
        let lastPost = (follow.posts && follow.posts[0]), tags = []
        let ago = lastPost && timeAgo(lastPost.updatedAt, now)
        let daily = follow.importance < 7
        if (follow.importance != imp)
          return

        let linkUrl = follow.fetchesContent ? `/view/${follow.id}` : follow.url
        return <li key={follow.id} class={`age-${ago ? ago.slice(-1) : "X"}`}>
          <Link to={linkUrl}></Link>
          <h3>
            <Link to={linkUrl}>
              <img class="favicon" src={url.resolve(follow.url, follow.photo || '/favicon.ico')}
                onerror={e => e.target.src=globe} width="20" height="20" />
            </Link>
            <Link class="url" to={linkUrl}>{follow.title || follow.actualTitle}</Link>
            {ago && <span class="latest">{ago}</span>}
            <span title={`graph of the last ${daily ? 'two' : 'six'} months`}>
              <svg class={`sparkline sparkline-${daily ? "d" : "w"}`}
                width="120" height="20" stroke-width="2"
                oncreate={el => sparkpoints(el, follow.activity, daily)}></svg></span>
              <a href="javascript:;" class="edit" onclick={e => actions.follows.edit(follow)} title="edit"><img src={images['270f']} /></a>
          </h3>
          <div class="extra trunc">
            <div class="post">{follow.posts && <ol class="title">{follow.posts.map(f => <li>{follow.fetchesContent ? f.title : <a href={f.url}>{f.title}</a>} <span class="ago">{timeAgo(f.updatedAt, now)}</span></li>)}</ol>}
              {!follow.fetchesContent && <a class="collapse" href="javascript:;"
                onclick={e => u(e.target).closest(".extra").toggleClass("trunc")}>&#x2022;&#x2022;&#x2022;</a>}
            </div>
            <div class="note">{follow.description}</div>
          </div>
        </li>
      })}</ol>
  </div>
}

export default (state, actions) =>
  (state.follows.started &&
    <article>
      <header>
        <Link to="/"><img src={images['fc']} alt="Fraidycat Logo" title="Fraidycat" /></Link>
      </header>
      <section>
        <div id="menu">
          <ul>
            <li><a href="javascript:;" title="Add a Follow" onclick={e => actions.follows.add()}>&#xff0b;</a></li>
            {true ? "" : <li><Link to="/logout" title="Logout">&#x1f6aa;</Link></li>}
          </ul>
        </div>

        <Switch>
          <Route path="/" render={ListFollow} />
          <Route path="/add" render={AddFollow} />
          <Route path="/add-feed" render={AddFeed} />
          <Route path="/edit" render={EditFollow} />
          <Route path="/edit/:id" render={EditFollowById} />
          <Route path="/view/:id" render={ViewFollowById} />
          <Route path="/tag/:tag" render={ListFollow} />
        </Switch>
      </section>
    </article>)
