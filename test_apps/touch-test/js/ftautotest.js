'use strict';

/*var FtAutoTest = {
  get testList() {
    delete this.testList;
    return this.testList = document.getElementById('test-list');
  },
  get configurationBtn() {
    delete this.configurationBtn;
    return this.configurationBtn = document.getElementById('configuration-btn');
  }
};
*/

window.addEventListener('load', function loadSettings() {
  window.removeEventListener('load', loadSettings);

  TpInformation.init();

  /*ConfigurationValue.configurationset.addEventListener('click', function () {
    alert(ConfigurationValue.lcdLength.value);
  });*/
  // panel navigation
  var oldHash = window.location.hash || '#root';
  function showPanel() {
    var hash = window.location.hash;

    var oldPanel = document.querySelector(oldHash);
    var newPanel = document.querySelector(hash);

    // switch previous/current/forward classes
    // FIXME: The '.peek' is here to avoid an ugly white
    // flickering when transitioning (gecko 18)
    // the forward class helps us 'peek' in the right direction
//    oldPanel.className = newPanel.className ? 'peek' : 'peek previous forward';
//    newPanel.className = newPanel.className ?
//      'current peek' : 'peek current forward';
    // switch previous/current classes
    oldPanel.className = newPanel.className ? '' : 'previous';
    newPanel.className = 'current';
    oldHash = hash;

    /**
     * Most browsers now scroll content into view taking CSS transforms into
     * account.  That's not what we want when moving between <section>s,
     * because the being-moved-to section is offscreen when we navigate to its
     * #hash.  The transitions assume the viewport is always at document 0,0.
     * So add a hack here to make that assumption true again.
     * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
     */
    if ((window.scrollX !== 0) || (window.scrollY !== 0)) {
      window.scrollTo(0, 0);
    }

    window.addEventListener('transitionend', function paintWait() {
      window.removeEventListener('transitionend', paintWait);

      // We need to wait for the next tick otherwise gecko gets confused
      setTimeout(function nextTick() {
        oldPanel.classList.remove('peek');
        oldPanel.classList.remove('forward');
        newPanel.classList.remove('peek');
        newPanel.classList.remove('forward');

        // Bug 818056 - When multiple visible panels are present,
        // they are not painted correctly. This appears to fix the issue.
        // Only do this after the first load
        if (oldPanel.className === 'current')
          return;

        oldPanel.addEventListener('transitionend', function onTransitionEnd() {
          oldPanel.removeEventListener('transitionend', onTransitionEnd);
        });
      });
    });
  }

  // startup
  window.addEventListener('hashchange', showPanel);
  switch (window.location.hash) {
    case '#root':
      // Nothing to do here; default startup case.
      break;
    case '':
      document.location.hash = 'root';
      break;
    default:
      document.getElementById('root').className = 'previous';
      showPanel();
      break;
  }
});
