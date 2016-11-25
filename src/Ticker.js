/**
* The MIT License
*
* Copyright (C) 2016 Isaac Sukin
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of
* this software and associated documentation files (the "Software"), to deal in
* the Software without restriction, including without limitation the rights to
* use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
* of the Software, and to permit persons to whom the Software is furnished to do
* so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*
* This module is a modified code from
*/

(function initPolyfils() {
  const windowOrGlobal = typeof window === 'object' ? window : global;

  /**
   * performance.now polyfill
   *
   * @license http://opensource.org/licenses/MIT
   * Copyright (C) 2015 Paul Irish
   *
   * Date.now() is supported everywhere except IE8. For IE8 we use the Date.now polyfill:
   * github.com/Financial-Times/polyfill-service/blob/master/polyfills/Date.now/polyfill.js
   *
   * As Safari 6 doesn't have support for NavigationTiming,
   * we use a Date.now() timestamp for relative values.
   */
  if (!('performance' in windowOrGlobal)) {
    windowOrGlobal.performance = {};
  }

  Date.now = (Date.now || function getNow() {  // thanks IE8
    return new Date().getTime();
  });

  if (!('now' in windowOrGlobal.performance)) {
    let nowOffset = Date.now();

    if (performance.timing && performance.timing.navigationStart) {
      nowOffset = performance.timing.navigationStart;
    }

    windowOrGlobal.performance.now = function now() {
      return Date.now() - nowOffset;
    };
  }

  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
  // MIT license
  {
    let lastTime = 0;
    const vendors = ['ms', 'moz', 'webkit', 'o'];

    for (let x = 0; x < vendors.length && !windowOrGlobal.requestAnimationFrame; ++x) {
      windowOrGlobal.requestAnimationFrame = windowOrGlobal[vendors[x] + 'RequestAnimationFrame'];
      windowOrGlobal.cancelAnimationFrame = windowOrGlobal[vendors[x] + 'CancelAnimationFrame']
        || windowOrGlobal[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!windowOrGlobal.requestAnimationFrame) {
      windowOrGlobal.requestAnimationFrame = function requestAnimationFrame(callback) {
        const currTime = new Date().getTime();
        const timeToCall = Math.max(0, 16 - (currTime - lastTime));
        const id = windowOrGlobal.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }

    if (!windowOrGlobal.cancelAnimationFrame) {
      windowOrGlobal.cancelAnimationFrame = function cancelAnimationFrame(id) {
        clearTimeout(id);
      };
    }
  }
}());

import stampit from 'stampit';
import EventEmitter from './EventEmitter';

const Ticker = stampit().init(function initTicker() {
  // The amount of time (in milliseconds) to simulate each time update()
  // runs. See `MainLoop.setSimulationTimestep()` for details.
  this.simulationTimestep = 1000 / 60;

  // The cumulative amount of in-app time that hasn't been simulated yet.
  // See the comments inside animate() for details.
  this.frameDelta = 0;

  // The timestamp in milliseconds of the last time the main loop was run.
  // Used to compute the time elapsed between frames.
  this.lastFrameTimeMs = 0;

  // An exponential moving average of the frames per secondthis..
  this.fps = 60;

  // The timestamp (in milliseconds) of the last time the `fps` moving
  // average was updated.
  this.lastFpsUpdate = 0;

  // The number of frames delivered in the current second.
  this.framesThisSecond = 0;

  // The number of times update() is called in a given frame. This is only
  // relevant inside of animate(), but a reference is held externally so that
  // this variable is not marked for garbage collection every time the main
  // loop runs.
  this.numUpdateSteps = 0;

  // The minimum amount of time in milliseconds that must pass since the last
  // frame was executed before another frame can be executed. The
  // multiplicative inverse caps the FPS (the default of zero means there is
  // no cap).
  this.minFrameDelay = 0;
  
  // Whether the main loop is running.
  this.running = false;
  
  this.paused = false;

  // `true` if `MainLoop.start()` has been called and the most recent time it
  // was called has not been followed by a call to `MainLoop.stop()`. This is
  // different than `running` because there is a delay of a few milliseconds
  // after `MainLoop.start()` is called before the application is considered
  // "running." This delay is due to waiting for the next frame.
  this.started = false;

  // Whether the simulation has fallen too far behind real time.
  // Specifically, `panic` will be set to `true` if too many updates occur in
  // one frame. This is only relevant inside of animate(), but a reference is
  // held externally so that this variable is not marked for garbage
  // collection every time the main loop runs.
  this.panic = false;

  // The ID of the currently executing frame. Used to cancel frames when
  // stopping the loop.
  this.rafHandle;

  /**
   * The main loop that runs updates and rendering.
   *
   * @param {DOMHighResTimeStamp} timestamp
   *   The current timestamp. In practice this is supplied by
   *   requestAnimationFrame at the time that it starts to fire callbacks. This
   *   should only be used for comparison to other timestamps because the epoch
   *   (i.e. the "zero" time) depends on the engine running this code. In engines
   *   that support `DOMHighResTimeStamp` (all modern browsers except iOS Safari
   *   8) the epoch is the time the page started loading, specifically
   *   `performance.timing.navigationStart`. Everywhere else, including node.js,
   *   the epoch is the Unix epoch (1970-01-01T00:00:00Z).
   *
   * @ignore
   */
  this.animate = timestamp => {
    // Run the loop again the next time the browser is ready to render.
    // We set rafHandle immediately so that the next frame can be canceled
    // during the current frame.
    this.rafHandle = requestAnimationFrame(this.animate);
    
    // Throttle the frame rate (if minFrameDelay is set to a non-zero value by
    // `MainLoop.setMaxAllowedFPS()`).
    if (timestamp < this.lastFrameTimeMs + this.minFrameDelay) {
      return;
    }

    // frameDelta is the cumulative amount of in-app time that hasn't been
    // simulated yet. Add the time since the last frame. We need to track total
    // not-yet-simulated time (as opposed to just the time elapsed since the
    // last frame) because not all actually elapsed time is guaranteed to be
    // simulated each frame. See the comments below for details.
    this.frameDelta += timestamp - this.lastFrameTimeMs;
    this.lastFrameTimeMs = timestamp;

    // Run any updates that are not dependent on time in the simulation. See
    // `MainLoop.setBegin()` for additional details on how to use this.
    this.emit('begin', timestamp, this.frameDelta);

    // Update the estimate of the frame rate, `fps`. Every second, the number
    // of frames that occurred in that second are included in an exponential
    // moving average of all frames per second, with an alpha of 0.25. This
    // means that more recent seconds affect the estimated frame rate more than
    // older seconds.
    if (timestamp > this.lastFpsUpdate + 1000) {
      // Compute the new exponential moving average with an alpha of 0.25.
      // Using constants inline is okay here.
      this.fps = 0.25 * this.framesThisSecond + 0.75 * this.fps;

      this.lastFpsUpdate = timestamp;
      this.framesThisSecond = 0;
    }

    this.framesThisSecond++;

    /*
     * A naive way to move an object along its X-axis might be to write a main
     * loop containing the statement `obj.x += 10;` which would move the object
     * 10 units per frame. This approach suffers from the issue that it is
     * dependent on the frame rate. In other words, if your application is
     * running slowly (that is, fewer frames per second), your object will also
     * appear to move slowly, whereas if your application is running quickly
     * (that is, more frames per second), your object will appear to move
     * quickly. This is undesirable, especially in multiplayer/multi-user
     * applications.
     *
     * One solution is to multiply the speed by the amount of time that has
     * passed between rendering frames. For example, if you want your object to
     * move 600 units per second, you might write `obj.x += 600 * delta`, where
     * `delta` is the time passed since the last frame. (For convenience, let's
     * move this statement to an update() function that takes `delta` as a
     * parameter.) This way, your object will move a constant distance over
     * time. However, at low frame rates and high speeds, your object will move
     * large distances every frame, which can cause it to do strange things
     * such as move through walls. Additionally, we would like our program to
     * be deterministic. That is, every time we run the application with the
     * same input, we would like exactly the same output. If the time between
     * frames (the `delta`) varies, our output will diverge the longer the
     * program runs due to accumulated rounding errors, even at normal frame
     * rates.
     *
     * A better solution is to separate the amount of time simulated in each
     * update() from the amount of time between frames. Our update() function
     * doesn't need to change; we just need to change the delta we pass to it
     * so that each update() simulates a fixed amount of time (that is, `delta`
     * should have the same value each time update() is called). The update()
     * function can be run multiple times per frame if needed to simulate the
     * total amount of time passed since the last frame. (If the time that has
     * passed since the last frame is less than the fixed simulation time, we
     * just won't run an update() until the the next frame. If there is
     * unsimulated time left over that is less than our timestep, we'll just
     * leave it to be simulated during the next frame.) This approach avoids
     * inconsistent rounding errors and ensures that there are no giant leaps
     * through walls between frames.
     *
     * That is what is done below. It introduces a new problem, but it is a
     * manageable one: if the amount of time spent simulating is consistently
     * longer than the amount of time between frames, the application could
     * freeze and crash in a spiral of death. This won't happen as long as the
     * fixed simulation time is set to a value that is high enough that
     * update() calls usually take less time than the amount of time they're
     * simulating. If it does start to happen anyway, see `MainLoop.setEnd()`
     * for a discussion of ways to stop it.
     *
     * Additionally, see `MainLoop.setUpdate()` for a discussion of performance
     * considerations.
     *
     * Further reading for those interested:
     *
     * - http://gameprogrammingpatterns.com/game-loop.html
     * - http://gafferongames.com/game-physics/fix-your-timestep/
     * - https://gamealchemist.wordpress.com/2013/03/16/thoughts-on-the-javascript-game-loop/
     * - https://developer.mozilla.org/en-US/docs/Games/Anatomy
     */
    let numUpdateSteps = 0;
    while (this.frameDelta >= this.simulationTimestep) {
      this.emit('update', this.simulationTimestep);
      this.frameDelta -= this.simulationTimestep;

      /*
       * Sanity check: bail if we run the loop too many times.
       *
       * One way this could happen is if update() takes longer to run than
       * the time it simulates, thereby causing a spiral of death. For ways
       * to avoid this, see `MainLoop.setEnd()`. Another way this could
       * happen is if the browser throttles serving frames, which typically
       * occurs when the tab is in the background or the device battery is
       * low. An event outside of the main loop such as audio processing or
       * synchronous resource reads could also cause the application to hang
       * temporarily and accumulate not-yet-simulated time as a result.
       *
       * 240 is chosen because, for any sane value of simulationTimestep, 240
       * updates will simulate at least one second, and it will simulate four
       * seconds with the default value of simulationTimestep. (Safari
       * notifies users that the script is taking too long to run if it takes
       * more than five seconds.)
       *
       * If there are more updates to run in a frame than this, the
       * application will appear to slow down to the user until it catches
       * back up. In networked applications this will usually cause the user
       * to get out of sync with their peers, but if the updates are taking
       * this long already, they're probably already out of sync.
       */
      if (++numUpdateSteps >= 240) {
        this.panic = true;

        break;
      }
    }

    /*
     * Render the screen. We do this regardless of whether update() has run
     * during this frame because it is possible to interpolate between updates
     * to make the frame rate appear faster than updates are actually
     * happening. See `MainLoop.setDraw()` for an explanation of how to do
     * that.
     *
     * We draw after updating because we want the screen to reflect a state of
     * the application that is as up-to-date as possible. (`MainLoop.start()`
     * draws the very first frame in the application's initial state, before
     * any updates have occurred.) Some sources speculate that rendering
     * earlier in the requestAnimationFrame callback can get the screen painted
     * faster; this is mostly not true, and even when it is, it's usually just
     * a trade-off between rendering the current frame sooner and rendering the
     * next frame later.
     *
     * See `MainLoop.setDraw()` for details about draw() itself.
     */
    this.emit('draw', this.frameDelta / this.simulationTimestep);

    // Run any updates that are not dependent on time in the simulation. See
    // `MainLoop.setEnd()` for additional details on how to use this.
    this.emit('end', this.fps, this.panic);

    this.panic = false;
  };
}).methods({
  /**
   * Gets how many milliseconds should be simulated by every run of update().
   *
   * See `MainLoop.setSimulationTimestep()` for details on this value.
   *
   * @return {Number}
   *   The number of milliseconds that should be simulated by every run of
   *   {@link #setUpdate update}().
   */
  getSimulationTimestep() {
    return this.simulationTimestep;
  },
  /**
   * Sets how many milliseconds should be simulated by every run of update().
   *
   * The perceived frames per second (FPS) is effectively capped at the
   * multiplicative inverse of the simulation timestep. That is, if the
   * timestep is 1000 / 60 (which is the default), then the maximum perceived
   * FPS is effectively 60. Decreasing the timestep increases the maximum
   * perceived FPS at the cost of running {@link #setUpdate update}() more
   * times per frame at lower frame rates. Since running update() more times
   * takes more time to process, this can actually slow down the frame rate.
   * Additionally, if the amount of time it takes to run update() exceeds or
   * very nearly exceeds the timestep, the application will freeze and crash
   * in a spiral of death (unless it is rescued; see `MainLoop.setEnd()` for
   * an explanation of what can be done if a spiral of death is occurring).
   *
   * The exception to this is that interpolating between updates for each
   * render can increase the perceived frame rate and reduce visual
   * stuttering. See `MainLoop.setDraw()` for an explanation of how to do
   * this.
   *
   * If you are considering decreasing the simulation timestep in order to
   * raise the maximum perceived FPS, keep in mind that most monitors can't
   * display more than 60 FPS. Whether humans can tell the difference among
   * high frame rates depends on the application, but for reference, film is
   * usually displayed at 24 FPS, other videos at 30 FPS, most games are
   * acceptable above 30 FPS, and virtual reality might require 75 FPS to
   * feel natural. Some gaming monitors go up to 144 FPS. Setting the
   * timestep below 1000 / 144 is discouraged and below 1000 / 240 is
   * strongly discouraged. The default of 1000 / 60 is good in most cases.
   *
   * The simulation timestep should typically only be changed at
   * deterministic times (e.g. before the main loop starts for the first
   * time, and not in response to user input or slow frame rates) to avoid
   * introducing non-deterministic behavior. The update timestep should be
   * the same for all players/users in multiplayer/multi-user applications.
   *
   * See also `MainLoop.getSimulationTimestep()`.
   *
   * @param {Number} timestep
   *   The number of milliseconds that should be simulated by every run of
   *   {@link #setUpdate update}().
   */
  setSimulationTimestep(timestep) {
    this.simulationTimestep = timestep;

    return this;
  },
  /**
   * Returns the exponential moving average of the frames per second.
   *
   * @return {Number}
   *   The exponential moving average of the frames per second.
   */
  getFPS() {
    return this.fps;
  },
  /**
   * Gets the maximum frame rate.
   *
   * Other factors also limit the FPS; see `MainLoop.setSimulationTimestep`
   * for details.
   *
   * See also `MainLoop.setMaxAllowedFPS()`.
   *
   * @return {Number}
   *   The maximum number of frames per second allowed.
   */
  getMaxAllowedFPS() {
    return 1000 / this.minFrameDelay;
  },

  /**
   * Sets a maximum frame rate.
   *
   * See also `MainLoop.getMaxAllowedFPS()`.
   *
   * @param {Number} [fps=Infinity]
   *   The maximum number of frames per second to execute. If Infinity or not
   *   passed, there will be no FPS cap (although other factors do limit the
   *   FPS; see `MainLoop.setSimulationTimestep` for details). If zero, this
   *   will stop the loop, and when the loop is next started, it will return
   *   to the previous maximum frame rate. Passing negative values will stall
   *   the loop until this function is called again with a positive value.
   *
   * @chainable
   */
  setMaxAllowedFPS(fps) {
    if (typeof fps === 'undefined') {
      this.fps = Infinity;
    }

    if (fps === 0) {
      this.stop();
    } else {
      // Dividing by Infinity returns zero.
      this.minFrameDelay = 1000 / fps;
    }

    return this;
  },

  /**
   * Reset the amount of time that has not yet been simulated to zero.
   *
   * This introduces non-deterministic behavior if called after the
   * application has started running (unless it is being reset, in which case
   * it doesn't matter). However, this can be useful in cases where the
   * amount of time that has not yet been simulated has grown very large
   * (for example, when the application's tab gets put in the background and
   * the browser throttles the timers as a result). In applications with
   * lockstep the player would get dropped, but in other networked
   * applications it may be necessary to snap or ease the player/user to the
   * authoritative state and discard pending updates in the process. In
   * non-networked applications it may also be acceptable to simply resume
   * the application where it last left off and ignore the accumulated
   * unsimulated time.
   *
   * @return {Number}
   *   The cumulative amount of elapsed time in milliseconds that has not yet
   *   been simulated, but is being discarded as a result of calling this
   *   function.
   */
  resetFrameDelta() {
    const oldFrameDelta = this.frameDelta;
    this.frameDelta = 0;
    return oldFrameDelta;
  },
  /**
   * Starts the main loop.
   *
   * Note that the application is not considered "running" immediately after
   * this function returns; rather, it is considered "running" after the
   * application draws its first frame. The distinction is that event
   * handlers should remain paused until the application is running, even
   * after `MainLoop.start()` is called. Check `MainLoop.isRunning()` for the
   * current status. To act after the application starts, register a callback
   * with requestAnimationFrame() after calling this function and execute the
   * action in that callback. It is safe to call `MainLoop.start()` multiple
   * times even before the application starts running and without calling
   * `MainLoop.stop()` in between, although there is no reason to do this;
   * the main loop will only start if it is not already started.
   *
   * See also `MainLoop.stop()`.
   */
  start() {
    if (!this.started) {
      // Since the application doesn't start running immediately, track
      // whether this function was called and use that to keep it from
      // starting the main loop multiple times.
      this.started = true;

      // In the main loop, draw() is called after update(), so if we
      // entered the main loop immediately, we would never render the
      // initial state before any updates occur. Instead, we run one
      // frame where all we do is draw, and then start the main loop with
      // the next frame.
      this.rafHandle = requestAnimationFrame(timestamp => {
        // Render the initial state before any updates occur.
        this.emit('draw', 1);

        // The application isn't considered "running" until the
        // application starts drawing.
        this.running = true;

        // Reset variables that are used for tracking time so that we
        // don't simulate time passed while the application was paused.
        this.lastFrameTimeMs = timestamp;
        this.lastFpsUpdate = timestamp;
        this.framesThisSecond = 0;

        // Start the main loop.
        this.rafHandle = requestAnimationFrame(this.animate);
      });
    }

    return this;
  },

  /**
   * Stops the main loop.
   *
   * Event handling and other background tasks should also be paused when the
   * main loop is paused.
   *
   * Note that pausing in multiplayer/multi-user applications will cause the
   * player's/user's client to become out of sync. In this case the
   * simulation should exit, or the player/user needs to be snapped to their
   * updated position when the main loop is started again.
   *
   * See also `MainLoop.start()` and `MainLoop.isRunning()`.
   */
  stop() {
    this.running = false;
    this.started = false;
    cancelAnimationFrame(this.rafHandle);

    return this;
  },
  pause() {
    if (this.isRunning() && !this.paused) {
      this.paused = true;
      this.stop();
    }
    
    return this;
  },
  resume() {
    if (this.paused) {
      this.paused = false;
      this.start();
    }
    
    return this;
  },
  /**
   * Returns whether the main loop is currently running.
   *
   * See also `MainLoop.start()` and `MainLoop.stop()`.
   *
   * @return {Boolean}
   *   Whether the main loop is currently running.
   */
  isRunning() {
    return this.running;
  },
}).compose(EventEmitter);

export default Ticker;
