/*
 A flexible and adaptable Generic Controller Script for Bitwig Studio by Thomas Helzle 2014
 This script does not work for every controller but should do so for most standard controllers that use CCs.

 - For any Mackie compatible controllers, please use the Mackie MCU script instead!

 To Do:

 - Add several flavours of relative Modes for Knobs in a Dropdown?
 - Implement Pad Transpose.
 - Implement Master Fader?
 - Usermappings?
 - 2/3 Input Version?


 Known Problems:

 - There is no way to account for Midi Controllers with different numbers of Input and Output Ports.
   Many Controllers send Notes and Controller Data on different Ports.
 - I can't have more ports and leave them empty, since then the script doesn't work.
 - I can't select the same input several times, since the input doesn't work in that case.
   There seems to be no way to work around this.

 - The Setting fields still don't hold their position reliably.
   Especially NumberSettings seem to come up on top most of the time.

 - I still miss toggle buttons a lot.
   A single button that can flip between active (orange) and inactive would often make so much more sense than two of them...

 - I personally would prefer the group labels not to be centered vertically but being aligned with the first control in the group.
   That would make it clearer to the user where the group actually starts.

 - host.showPopupNotification() doesn't seem to work right while the preferences are open.
   It seems to come up with a delay and then vanishes too fast to read.

 - How to deal with different Button behaviours?
 - Some Controllers use toggles already, so you can't filter for on/off or users have to press buttons twice.
 - Others send normal on/off CCs, so you have to filter or the button will only stay on while the button is pressed.
 - Sysex Transport Knobs only send the on-state, so you don't know when it's held down for repeating FFW/REW.


 */

// Load the Bitwig Studio API:
loadAPI(1);

// Load additional helper functions:
load("TomsMidi.js");

// Main Global Variable:
var gen;

// Main Object:
function Generic() {

   // Views:
   this.prefs = host.getPreferences();
   this.docs = host.getDocumentState();
   this.notifications = host.getNotificationSettings();
   this.transport = host.createTransport();
   this.cursorDevice = host.createEditorCursorDevice();
   this.trackBank = host.createTrackBank(8, 8, 0);

   // User Mappings:
   this.lowCC = 0;
   this.highCC = 119;
   this.userControls = host.createUserControls(this.highCC - this.lowCC);

   // Midi Monitor:
   this.midiMonEnablePre = null;
   this.midiMonEnable = false;
   this.midiMonChannelPre = null;

   // Midi Inputs:
   this.keysMidi = null;
   this.midiChKeys = 0;
   this.midiChKeysPre = null;
   this.midiChKeysFilter = "?0????";
   this.padsMidi = null;
   this.midiChPads = 9;
   this.midiChPadsPre = null;
   this.midiChPadsFilter = "?9????";

   // Cursor Device:
   this.knobMode = 0;
   this.knobRelative = false;
   this.selectedPage = 0;
   this.previousParameterPageEnabled = false;
   this.nextParameterPageEnabled = false;
   this.pageNames = [];
   this.pageCount = 0;
   this.knobLoopLength = 0;

   // Midi Monitor:
   this.midiMonEnablePre = null;
   this.midiMonEnable = false;
   this.midiMonChannelPre = null;
   this.midiMonTypePre = null;
   this.midiMonDataPre = null;

   // Transport:
   this.tranportEnabledPre = null;
   this.transportEnabled = false;
   this.transportSelectionPre = null;
   this.transportSelection = "Rewind";
   this.transportSelectionNum = 0;
   this.transportCCsPre = [];
   this.transportCCs = [];
   this.learnTransportPre = null;
   this.learnTransport = false;

   for (var i = 0; i < 6; i++) {
      this.transportCCsPre[i] = null;
      this.transportCCs[i] = 0;
   }

   // Knobs:
   this.knobsEnabledPre = null;
   this.knobsEnabled = false;
   this.knobsRelativePre = null;
   this.knobSelectionPre = null;
   this.knobSelection = "Knob 1";
   this.knobSelectionNum = 0;
   this.knobCCsPre = [];
   this.knobCCs = [];
   this.learnKnobsSinglePre = null;
   this.learnKnob = false;
   this.learnKnobsAllPre = null;
   this.learnAllKnobs = false;
   for (var i = 0; i < 8; i++) {
      this.knobCCsPre[i] = null;
      this.knobCCs[i] = 0;
   }

   // Knob Mode Buttons:
   this.knobModeButtonsPre = null;
   this.knobModeButton1CCPre = null;
   this.knobModeButton1CC = 0;
   this.knobModeButton2CCPre = null;
   this.knobModeButton2CC = 0;
   this.learnKnobModeButtonsPre = null;
   this.knobModeButtonsNum = 0;
   this.learnKnobModeButtons = false;
   this.knobModeButton = 0;

   // Faders:
   this.fadersEnabledPre = null;
   this.fadersEnabled = false;
   this.faderSelectionPre = null;
   this.faderSelection = "Fader 1";
   this.faderSelectionNum = 0;
   this.faderCCsPre = [];
   this.faderCCs = [];
   this.learnFadersSinglePre = null;
   this.learnFader = false;
   this.learnFadersAllPre = null;
   this.learnAllFaders = false;
   for (var i = 0; i < 8; i++) {
      this.faderCCsPre[i] = null;
      this.faderCCs[i] = 0;
   }

   // Track select buttons:
   this.trackButtonsEnabledPre = null;
   this.trackButtonsEnabled = false;
   this.trackButtonsSelectionPre = null;
   this.trackButtonsSelection = "Track Select 1";
   this.trackButtonsSelectionNum = 0;
   this.trackButtonsCCsPre = [];
   this.trackButtonsCCs = [];
   this.learnTrackButtonsSinglePre = null;
   this.learnTrackButton = false;
   this.learnTrackButtonsAllPre = null;
   this.learnAllTrackButtons = false;
   for (var i = 0; i < 8; i++) {
      this.trackButtonsCCsPre[i] = null;
      this.trackButtonsCCs[i] = 0;
   }


   return this;
}

// Global Constants for Enums:
const ONOFF = ["On", "Off"];
const YESNO = ["Yes", "No"];
const LEARN = ["Learn", "Off"];
const TRANSPORT = ["Rewind", "FastForward", "Stop", "Play/Pause", "Record", "Loop"];
const KNOBS = ["Knob 1", "Knob 2", "Knob 3", "Knob 4", "Knob 5", "Knob 6", "Knob 7", "Knob 8"];
const KNOBMODE = ["None", "One", "Two"];
const KNOBSRELATIVE = ["Absolute", "Relative (2's complement)"];
const FADERS = ["Fader 1", "Fader 2", "Fader 3", "Fader 4", "Fader 5", "Fader 6", "Fader 7", "Fader 8"];
const TRACKSELECTION = ["Track Select 1", "Track Select 2", "Track Select 3", "Track Select 4", "Track Select 5", "Track Select 6", "Track Select 7", "Track Select 8"];
const FADERBANK = ["None", "Two"];

// Definition of the controller:
host.defineController("Generic", "Controller", "1.0", "8df76600-0042-11e4-9191-0800200c9a66", "Thomas Helzle");
host.defineMidiPorts(1, 1);

function init() {

   // Instantiate the main object:
   gen = Generic();

   // Set Notifications:
   gen.notifications.setShouldShowValueNotifications(true);
   gen.notifications.setShouldShowTrackSelectionNotifications(true);
   gen.notifications.setShouldShowSelectionNotifications(true);
   gen.notifications.setShouldShowPresetNotifications(true);
   gen.notifications.setShouldShowMappingNotifications(false);
   gen.notifications.setShouldShowDeviceSelectionNotifications(true);
   gen.notifications.setShouldShowDeviceLayerSelectionNotifications(true);
   gen.notifications.setShouldShowChannelSelectionNotifications(true);

   // Cursor Device Observers:
   gen.cursorDevice.addNameObserver(50, "None", function (name) {
      gen.knobMode = 0;
   });
   gen.cursorDevice.addSelectedPageObserver(0, function (value) {
      gen.selectedPage = value;
   });
   gen.cursorDevice.addPreviousParameterPageEnabledObserver(function (value) {
      gen.previousParameterPageEnabled = value;
   });
   gen.cursorDevice.addNextParameterPageEnabledObserver(function (value) {
      gen.nextParameterPageEnabled = value;
   });
   gen.cursorDevice.addPageNamesObserver(function (value) {
      gen.pageNames = [];
      gen.pageCount = arguments.length;
      for (var i = 0; i < arguments.length; i++) {
         gen.pageNames[i] = arguments[i];
      }
      gen.knobLoopLength = 2 + gen.pageCount;
   });

   // Midi Monitor:
   gen.midiMonEnablePre = gen.prefs.getEnumSetting("Enable Midi Monitor: ", "Midi Monitor", ONOFF, "Off");
   gen.midiMonEnablePre.addValueObserver(function (value) {
      gen.midiMonEnable = (value === "On");
      gen.midiMonEnable ? gen.midiMonChannelPre.show() : gen.midiMonChannelPre.hide();
      gen.midiMonEnable ? gen.midiMonTypePre.show() : gen.midiMonTypePre.hide();
      gen.midiMonEnable ? gen.midiMonDataPre.show() : gen.midiMonDataPre.hide();
 if (!gen.midiMonEnable) {
         gen.midiMonChannelPre.set("");
         gen.midiMonTypePre.set("");
         gen.midiMonDataPre.set("");
      }
   });
   gen.midiMonChannelPre = gen.prefs.getStringSetting("Midi Channel: ", "Midi Monitor", 50, "");
   gen.midiMonTypePre = gen.prefs.getStringSetting("Midi Event Type: ", "Midi Monitor", 50, "");
   gen.midiMonDataPre = gen.prefs.getStringSetting("Midi Data (decimal [hex]): ", "Midi Monitor", 50, "");

   gen.midiMonEnablePre.set("Off");

   // Midi Settings, hidden for the time being (not working reliably):
   //gen.midiChKeysPre = gen.prefs.getNumberSetting("MIDI Channel Keys: ", "Midi Settings", 0, 16, 1, "", 1);
   //gen.midiChKeysPre.addValueObserver(128, function (value) {
   //   if (value == 0) {
   //      gen.midiChKeysFilter = "??????";
   //   }
   //   else {
   //      gen.midiChKeysFilter = "?" + value - 1 + "????";
   //   }
   //});
   //gen.midiChKeysPre.hide();
   //
   //gen.midiChPadsPre = gen.prefs.getNumberSetting("MIDI Channel Pads: ", "Midi Settings", 0, 16, 1, "", 10);
   //gen.midiChPadsPre.addValueObserver(128, function (value) {
   //   value = Math.round(value);
   //   if (value == 0) {
   //      gen.midiChPadsFilter = "??????";
   //   }
   //   else {
   //      gen.midiChPadsFilter = "?" + value - 1 + "????";
   //   }
   //});
   //gen.midiChPadsPre.hide();

   // Transport Controls:
   gen.tranportEnabledPre = gen.prefs.getEnumSetting("Controller has Transport Buttons", "Transport", YESNO, "No");
   gen.transportSelectionPre = gen.prefs.getEnumSetting("Transport Buttons", "Transport", TRANSPORT, "Rewind");
   gen.transportCCsPre[0] = gen.prefs.getNumberSetting("Rewind CC: ", "Transport", 0, 127, 1, "", 0);
   gen.transportCCsPre[1] = gen.prefs.getNumberSetting("Fast Forward CC: ", "Transport", 0, 127, 1, "", 0);
   gen.transportCCsPre[2] = gen.prefs.getNumberSetting("Stop CC: ", "Transport", 0, 127, 1, "", 0);
   gen.transportCCsPre[3] = gen.prefs.getNumberSetting("Play/Pause CC: ", "Transport", 0, 127, 1, "", 0);
   gen.transportCCsPre[4] = gen.prefs.getNumberSetting("Record CC: ", "Transport", 0, 127, 1, "", 0);
   gen.transportCCsPre[5] = gen.prefs.getNumberSetting("Loop CC: ", "Transport", 0, 127, 1, "", 0);
   gen.learnTransportPre = gen.prefs.getEnumSetting("Learn current Transport Button", "Transport", LEARN, "Off");

   gen.tranportEnabledPre.addValueObserver(function (value) {
      gen.transportEnabled = (value === "Yes");
      setTransportPrefsVisible();
   });
   gen.transportSelectionPre.addValueObserver(function (value) {
      gen.transportSelection = value;
      for (var i = 0; i < 6; i++) {
         if (value === TRANSPORT[i]) {
            gen.transportSelectionNum = i;
         }
      }
      setTransportPrefsVisible();
   });
   gen.learnTransportPre.addValueObserver(function (value) {
      gen.learnTransport = (value === "Learn");
   });
   for (var i = 0; i < 6; i++) {
      gen.transportCCsPre[i].addValueObserver(128, getValueObserverFunc(i, gen.transportCCs));
   }

   // Midi Learn Knobs:
   gen.knobsEnabledPre = gen.prefs.getEnumSetting("Controller Has Knobs", "Knobs", YESNO, "No");
   gen.knobSelectionPre = gen.prefs.getEnumSetting("Select the Knob to learn: ", "Knobs", KNOBS, "Knob 1");
   gen.knobsRelativePre = gen.prefs.getEnumSetting("Knobs are relative", "Knobs", KNOBSRELATIVE, "Absolute");
   gen.knobsRelativePre.addValueObserver(function (value) {
      gen.knobsRelative = !(value === "Absolute");
   });

   for (var i = 0; i < 8; i++) {
      gen.knobCCsPre[i] = gen.prefs.getNumberSetting("Knob " + (i + 1) + " CC: ", "Knobs", 0, 127, 1, "", 0);
   }
   gen.learnKnobsSinglePre = gen.prefs.getEnumSetting("Learn current Knob: ", "Knobs", LEARN, "Off");
   gen.learnKnobsAllPre = gen.prefs.getEnumSetting("Learn all Knobs: ", "Knobs", LEARN, "Off");
   gen.knobsEnabledPre.addValueObserver(function (value) {
      gen.knobsEnabled = (value === "Yes");
      setKnobPrefsVisible();
   });
   gen.knobSelectionPre.addValueObserver(function (value) {
      gen.knobSelection = value;
      for (var i = 0; i < 8; i++) {
         if (KNOBS[i] === value) {
            gen.knobSelectionNum = i;
         }
      }
      setKnobPrefsVisible();
   });
   for (var i = 0; i < 8; i++) {
      gen.knobCCsPre[i].addValueObserver(128, getValueObserverFunc(i, gen.knobCCs));
      gen.knobCCsPre[i].hide();
   }
   gen.learnKnobsSinglePre.addValueObserver(function (value) {
      gen.learnKnob = (value === "Learn");
   });
   gen.learnKnobsAllPre.addValueObserver(function (value) {
      gen.learnAllKnobs = (value === "Learn");
      if (gen.learnAllKnobs) {
         gen.knobSelectionPre.set("Knob 1");
         host.showPopupNotification("Please move Knob 1.");
      }
   });

   // Knob Modes:
   gen.knobModeButtonsPre = gen.prefs.getEnumSetting("Knob Mode Selection Button(s)", "Knob Mode Buttons", KNOBMODE, "None");
   gen.knobModeButton1CCPre = gen.prefs.getNumberSetting("Button 1 CC", "Knob Mode Buttons", 0, 127, 1, "", 0);
   gen.knobModeButton2CCPre = gen.prefs.getNumberSetting("Button 2 CC", "Knob Mode Buttons", 0, 127, 1, "", 0);
   gen.learnKnobModeButtonsPre = gen.prefs.getEnumSetting("Learn Knob Mode Buttons: ", "Knob Mode Buttons", LEARN, "Off");

   gen.knobModeNextDoc = gen.docs.getSignalSetting("Next", "Knob Mode", "Next");
   gen.knobModePreviousDoc = gen.docs.getSignalSetting("Previous", "Knob Mode", "Previous");

   gen.knobModeButtonsPre.addValueObserver(function (value) {
      switch (value) {
         case KNOBMODE[0]:
            gen.knobModeButton1CCPre.hide();
            gen.knobModeButton2CCPre.hide();
            gen.learnKnobModeButtonsPre.hide();
            gen.knobModeButtonsNum = 0;
            break;
         case KNOBMODE[1]:
            gen.knobModeButton1CCPre.show();
            gen.knobModeButton2CCPre.hide();
            gen.learnKnobModeButtonsPre.show();
            gen.knobModeButtonsNum = 1;
            break;
         case KNOBMODE[2]:
            gen.knobModeButton1CCPre.show();
            gen.knobModeButton2CCPre.show();
            gen.learnKnobModeButtonsPre.show();
            gen.knobModeButtonsNum = 2;
            break;
      }
   });
   gen.knobModeButton1CCPre.addValueObserver(128, function (value) {
      gen.knobModeButton1CC = value;
   });
   gen.knobModeButton2CCPre.addValueObserver(128, function (value) {
      gen.knobModeButton2CC = value;
   });
   gen.learnKnobModeButtonsPre.addValueObserver(function (value) {
      gen.learnKnobModeButtons = (value === "Learn");
      if (gen.learnKnobModeButtons) {
         host.showPopupNotification("Please press Button 1.");
         gen.knobModeButton = 0;
      }
   });

   gen.knobModePreviousDoc.addSignalObserver(function(value){
      if (gen.knobMode > 0) {
         gen.knobMode -= 1;
      }
      else {
         gen.knobMode = gen.knobLoopLength;
      }
      setKnobMode();
   });
   gen.knobModeNextDoc.addSignalObserver(function(value){
      if (gen.knobMode < gen.knobLoopLength) {
         gen.knobMode += 1;
      }
      else {
         gen.knobMode = 0;
      }
      setKnobMode();
   });

   // Midi Learn Track Select Buttons:
   gen.trackButtonsEnabledPre = gen.prefs.getEnumSetting("Track Selectors: ", "Track Selection", YESNO, "No");
   gen.trackButtonsSelectionPre = gen.prefs.getEnumSetting("Learn track selector: ", "Track Selection", TRACKSELECTION, "Track Select 1");
   for (var i = 0; i < 8; i++) {
      gen.trackButtonsCCsPre[i] = gen.prefs.getNumberSetting("Track Select " + (i + 1) + " CC: ", "Track Selection", 0, 127, 1, "", 0);
   }
   gen.learnTrackButtonsSinglePre = gen.prefs.getEnumSetting("Learn current track selector: ", "Track Selection", LEARN, "Off");
   gen.learnTrackButtonsAllPre = gen.prefs.getEnumSetting("Learn all track selectors: ", "Track Selection", LEARN, "Off");

   gen.trackButtonsEnabledPre.addValueObserver(function (value) {
      gen.trackButtonsEnabled = (value === "Yes");
      setTrackButtonsPrefsVisible();
   });

   gen.trackButtonsSelectionPre.addValueObserver(function (value) {
      gen.trackButtonsSelection = value;
      for (var i = 0; i < 8; i++) {
         if (TRACKSELECTION[i] === value) {
            gen.trackButtonsSelectionNum = i;
         }
      }
      setTrackButtonsPrefsVisible();
   });

   for (var i = 0; i < 8; i++) {
      gen.trackButtonsCCsPre[i].addValueObserver(128, getValueObserverFunc(i, gen.trackButtonsCCs));
      gen.trackButtonsCCsPre[i].hide();
   }

   gen.learnTrackButtonsSinglePre.addValueObserver(function (value) {
      gen.learnTrackButton = (value === "Learn");
   });

   gen.learnTrackButtonsAllPre.addValueObserver(function (value) {
      gen.learnAllTrackButtons = (value === "Learn");
      if (gen.learnAllTrackButtons) {
         gen.trackButtonsSelectionPre.set("Track Select 1");
         host.showPopupNotification("Please press track select button 1");
      }
   });

   // Midi Learn Faders:
   gen.fadersEnabledPre = gen.prefs.getEnumSetting("Controller has Faders: ", "Faders", YESNO, "No");
   gen.faderSelectionPre = gen.prefs.getEnumSetting("Select the Fader to learn: ", "Faders", FADERS, "Fader 1");
   for (var i = 0; i < 8; i++) {
      gen.faderCCsPre[i] = gen.prefs.getNumberSetting("Fader " + (i + 1) + " CC: ", "Faders", 0, 127, 1, "", 0);
   }
   gen.learnFadersSinglePre = gen.prefs.getEnumSetting("Learn current Fader: ", "Faders", LEARN, "Off");
   gen.learnFadersAllPre = gen.prefs.getEnumSetting("Learn all Faders: ", "Faders", LEARN, "Off");

   gen.fadersEnabledPre.addValueObserver(function (value) {
      gen.fadersEnabled = (value === "Yes");
      setFadersPrefsVisible();
   });

   gen.faderSelectionPre.addValueObserver(function (value) {
      gen.faderSelection = value;
      for (var i = 0; i < 8; i++) {
         if (FADERS[i] === value) {
            gen.faderSelectionNum = i;
         }
      }
      setFadersPrefsVisible();
   });

   for (var i = 0; i < 8; i++) {
      gen.faderCCsPre[i].addValueObserver(128, getValueObserverFunc(i, gen.faderCCs));
      gen.faderCCsPre[i].hide();
   }

   gen.learnFadersSinglePre.addValueObserver(function (value) {
      gen.learnFader = (value === "Learn");
   });

   gen.learnFadersAllPre.addValueObserver(function (value) {
      gen.learnAllFaders = (value === "Learn");
      if (gen.learnAllFaders) {
         gen.faderSelectionPre.set("Fader 1");
         host.showPopupNotification("Please move Fader 1");
      }
   });


   // Trackbank Buttons:
   gen.faderBankButtonsPre = gen.prefs.getEnumSetting("Fader Bank Navigation Buttons", "Fader Bank Buttons", FADERBANK, "None");
   gen.faderBankButton1CCPre = gen.prefs.getNumberSetting("Button 1 CC", "Fader Bank Buttons", 0, 127, 1, "", 0);
   gen.faderBankButton2CCPre = gen.prefs.getNumberSetting("Button 2 CC", "Fader Bank Buttons", 0, 127, 1, "", 0);
   gen.learnFaderBankButtonsPre = gen.prefs.getEnumSetting("Learn Fader Bank Buttons: ", "Fader Bank Buttons", LEARN, "Off");

   gen.faderBankPreviousDoc = gen.docs.getSignalSetting("Previous", "Fader Bank", "Previous");
   gen.faderBankNextDoc = gen.docs.getSignalSetting("Next", "Fader Bank", "Next");

   gen.faderBankButtonsPre.addValueObserver(function (value) {
      switch (value) {
         case FADERBANK[0]:
            gen.faderBankButton1CCPre.hide();
            gen.faderBankButton2CCPre.hide();
            gen.learnFaderBankButtonsPre.hide();
            gen.faderBankButtonsNum = 0;
            break;
         case FADERBANK[1]:
         case FADERBANK[1]:
            gen.faderBankButton1CCPre.show();
            gen.faderBankButton2CCPre.show();
            gen.learnFaderBankButtonsPre.show();
            gen.faderBankButtonsNum = 2;
            break;
      }
   });
   gen.faderBankButton1CCPre.addValueObserver(128, function (value) {
      gen.faderBankButton1CC = value;
   });
   gen.faderBankButton2CCPre.addValueObserver(128, function (value) {
      gen.faderBankButton2CC = value;
   });
   gen.learnFaderBankButtonsPre.addValueObserver(function (value) {
      gen.learnFaderBankButtons = (value === "Learn");
      if (gen.learnFaderBankButtons) {
         host.showPopupNotification("Please press Button 1.");
         gen.faderBankButton = 0;
      }
   });

   gen.faderBankPreviousDoc.addSignalObserver(function(value){
      gen.trackBank.scrollChannelsUp();
   });
   gen.faderBankNextDoc.addSignalObserver(function(value){
      gen.trackBank.scrollChannelsDown();
   });

   // Create Note Inputs and set options:

   // Define Callbacks:
   host.getMidiInPort(0).setMidiCallback(onMidi);
   host.getMidiInPort(0).setSysexCallback(onSysex);

   // Create Key Input:
   gen.keysMidi = host.getMidiInPort(0).createNoteInput(":  Keys", this.midiChKeysFilter);
   gen.keysMidi.setShouldConsumeEvents(false);
   gen.keysMidi.assignPolyphonicAftertouchToExpression(gen.midiChKeys, NoteExpression.TIMBRE_UP, 2);

   // Create Pad Input:
   gen.padsMidi = host.getMidiInPort(0).createNoteInput(":  Pads", this.midiChPadsFilter);
   gen.padsMidi.setShouldConsumeEvents(false);
}

// Main Midi Callback:
function onMidi(status, data1, data2) {
   // Creating the convenience Midi object...
   midi = new MidiData(status, data1, data2);

   // Creating the data for the Midi Monitor in Preferences:
   if (gen.midiMonEnable) {
      gen.midiMonChannelPre.set(midi.channel() + 1);
      switch (midi.type()) {
         case "CC":
            gen.midiMonTypePre.set(midi.type() + " " + midi.data1 + "  -  Value:  " + midi.data2);
            break;
         case "NoteOn":
            gen.midiMonTypePre.set(midi.type() + ": " + midi.data1 + "  -  Velocity:  " + midi.data2);
            break;
         case "NoteOff":
            gen.midiMonTypePre.set(midi.type() + ": " + midi.data1 + "  -  Velocity:  " + midi.data2);
            break;
         case "KeyPressure":
            break;
         case "ProgramChange":
            gen.midiMonTypePre.set(midi.type() + ":  " + midi.data1);
            break;
         case "ChannelPressure":
            gen.midiMonTypePre.set(midi.type() + ":  " + midi.data1);
            break;
         case "PitchBend":
            gen.midiMonTypePre.set(midi.type() + ":  " + pitchBendValue(data1, data2));
            break;
         case "Other":
      }
      gen.midiMonDataPre.set(prettyMidi(status, data1, data2));
   }

   // Switching over the type of incoming Midi message:
   switch (midi.type()) {
      // handle all CCs:
      case "CC":
         // Handles the default value 0 for the Midi-Learns so that unlearned controls don't react to it.
         if (midi.data1 === 0) {
            return;
         }
         // Midi Learn a single Knob:
         else if (gen.learnKnob) {
            gen.learnKnobsSinglePre.set("Off");
            gen.knobCCsPre[gen.knobSelectionNum].set(data1, 128);
         }
         // Midi Learn all 8 Knobs:
         else if (gen.learnAllKnobs) {
            switch (gen.knobSelectionNum) {
               case 0:
                  if (gen.knobCCs[7] != data1) {
                     gen.knobCCsPre[gen.knobSelectionNum].set(data1, 128);
                     gen.knobSelectionPre.set("Knob 2");
                     host.showPopupNotification("Please move Knob 2.");
                  }
                  break;
               case 7:
                  if (gen.knobCCs[gen.knobSelectionNum - 1] != data1) {
                     gen.learnKnobsAllPre.set("Off");
                     gen.knobCCsPre[gen.knobSelectionNum].set(data1, 128);
                     gen.knobSelectionPre.set("Knob 1");
                     host.showPopupNotification("Midi Learn finished.");
                  }
                  break;
               default:
                  if (gen.knobCCs[gen.knobSelectionNum - 1] != data1) {
                     gen.knobCCsPre[gen.knobSelectionNum].set(data1, 128);
                     gen.knobSelectionPre.set("Knob " + (gen.knobSelectionNum + 2));
                     host.showPopupNotification("Please move Knob " + (gen.knobSelectionNum + 2) + ".");
                  }
                  break;
            }
         }
         // Midi Learn a single Fader:
         if (gen.learnFader) {
            gen.learnFadersSinglePre.set("Off");
            gen.faderCCsPre[gen.faderSelectionNum].set(data1, 128);
         }
         // Midi Learn all 8 Faders:
         else if (gen.learnAllFaders) {
            switch (gen.faderSelectionNum) {
               case 0:
                  if (gen.faderCCs[7] != data1) {
                     gen.faderCCsPre[gen.faderSelectionNum].set(data1, 128);
                     gen.faderSelectionPre.set("Fader 2");
                     host.showPopupNotification("Please move Fader 2.");
                  }
                  break;
               case 7:
                  if (gen.faderCCs[gen.faderSelectionNum - 1] != data1) {
                     gen.learnFadersAllPre.set("Off");
                     gen.faderCCsPre[gen.faderSelectionNum].set(data1, 128);
                     gen.faderSelectionPre.set("Fader 1");
                     host.showPopupNotification("Midi Learn finished.");
                  }
                  break;
               default:
                  if (gen.faderCCs[gen.faderSelectionNum - 1] != data1) {
                     gen.faderCCsPre[gen.faderSelectionNum].set(data1, 128);
                     gen.faderSelectionPre.set("Fader " + (gen.faderSelectionNum + 2));
                     host.showPopupNotification("Please move Fader " + (gen.faderSelectionNum + 2) + ".");
                  }
                  break;
            }
         }

         // Midi Learn a single track select button:
         if (gen.learnTrackButton) {
            gen.learnTrackButtonsSinglePre.set("Off");
            gen.trackButtonsCCsPre[gen.trackButtonsSelectionNum].set(data1, 128);
         }
         // Midi Learn all 8 track select buttons:
         else if (gen.learnAllTrackButtons) {
            switch (gen.trackButtonsSelectionNum) {
               case 0:
                  if (gen.trackButtonsCCs[7] != data1) {
                     gen.trackButtonsCCsPre[gen.trackButtonsSelectionNum].set(data1, 128);
                     gen.trackButtonsSelectionPre.set("Track Select 2");
                     host.showPopupNotification("Please press track selection button 2.");
                  }
                  break;
               case 7:
                  if (gen.trackButtonsCCs[gen.trackButtonsSelectionNum - 1] != data1) {
                     gen.learnTrackButtonsAllPre.set("Off");
                     gen.trackButtonsCCsPre[gen.trackButtonsSelectionNum].set(data1, 128);
                     gen.trackButtonsSelectionPre.set("Track Select 1");
                     host.showPopupNotification("Midi Learn finished.");
                  }
                  break;
               default:
                  if (gen.trackButtonsCCs[gen.trackButtonsSelectionNum - 1] != data1) {
                     gen.trackButtonsCCsPre[gen.trackButtonsSelectionNum].set(data1, 128);
                     gen.trackButtonsSelectionPre.set("Track Select " + (gen.trackButtonsSelectionNum + 2));
                     host.showPopupNotification("Please press track selection button " + (gen.trackButtonsSelectionNum + 2) + ".");
                  }
                  break;
            }
         }
         // Midi Learn the Button(s) to navigate the Fader Bank:
         else if (gen.learnFaderBankButtons) {
            if (gen.faderBankButton === 0) {
               gen.faderBankButton1CCPre.set(midi.data1, 128);
               gen.faderBankButton = 1;
               host.showPopupNotification("Please press Button 2.");
            }
            else if (gen.faderBankButton === 1) {
               if (gen.faderBankButton1CC != midi.data1) {
                  gen.faderBankButton2CCPre.set(midi.data1, 128);
                  gen.learnFaderBankButtonsPre.set("Off");
                  host.showPopupNotification("Midi Learn finished.");
               }
            }
         }
         // Midi Learn the Button(s) to select the Mode for the Knobs:
         else if (gen.learnKnobModeButtons) {
            if (gen.knobModeButton === 0) {
               gen.knobModeButton1CCPre.set(midi.data1, 128);
               if (gen.knobModeButtonsNum === 1) {
                  gen.learnKnobModeButtonsPre.set("Off");
                  host.showPopupNotification("Midi Learn finished.");
               }
               else if (gen.knobModeButtonsNum === 2) {
                  gen.knobModeButton = 1;
                  host.showPopupNotification("Please press Button 2.");
               }
            }
            else if (gen.knobModeButton === 1) {
               if (gen.knobModeButton1CC != midi.data1) {
                  gen.knobModeButton2CCPre.set(midi.data1, 128);
                  gen.learnKnobModeButtonsPre.set("Off");
                  host.showPopupNotification("Midi Learn finished.");
               }
            }
         }
         // Midi Learn the Transport Buttons (if not Sysex).
         else if (gen.learnTransport) {
            gen.learnTransportPre.set("Off");
            gen.transportCCsPre[gen.transportSelectionNum].set(data1, 128);
         }
         else {
            // handle specific CCs:
            switch (midi.data1) {
               // Transport:
               case gen.transportCCs[0]:
                  if (midi.isOn()) {
                     gen.transport.rewind();
                  }
                  break;
               case gen.transportCCs[1]:
                  if (midi.isOn()) {
                     gen.transport.fastForward();
                  }
                  break;
               case gen.transportCCs[2]:
                  if (midi.isOn()) {
                     gen.transport.stop();
                  }
                  break;
               case gen.transportCCs[3]:
                  if (midi.isOn()) {
                     gen.transport.play();
                  }
                  break;
               case gen.transportCCs[4]:
                  if (midi.isOn()) {
                     gen.transport.record();
                  }
                  break;
               case gen.transportCCs[5]:
                  if (midi.isOn()) {
                     gen.transport.toggleLoop();
                  }
                  break;
               // Cycle Knob Mode:
               case gen.knobModeButton1CC:
                     if (gen.knobMode < gen.knobLoopLength) {
                        gen.knobMode += 1;
                     }
                     else {
                        gen.knobMode = 0;
                     }
                     setKnobMode();
                  break;
               case gen.knobModeButton2CC:
                     if (gen.knobMode > 0) {
                        gen.knobMode -= 1;
                     }
                     else {
                        gen.knobMode = gen.knobLoopLength;
                     }
                     setKnobMode();
                  break;
               // Track Bank Navigation:
               case gen.faderBankButton1CC:
                     gen.trackBank.scrollChannelsUp();
                  break;
               case gen.faderBankButton2CC:
                     gen.trackBank.scrollChannelsDown();
                  break;

               // Set Knobs:
               case gen.knobCCs[0]:
                  setKnobValue(0, midi);
                  break;
               case gen.knobCCs[1]:
                  setKnobValue(1, midi);
                  break;
               case gen.knobCCs[2]:
                  setKnobValue(2, midi);
                  break;
               case gen.knobCCs[3]:
                  setKnobValue(3, midi);
                  break;
               case gen.knobCCs[4]:
                  setKnobValue(4, midi);
                  break;
               case gen.knobCCs[5]:
                  setKnobValue(5, midi);
                  break;
               case gen.knobCCs[6]:
                  setKnobValue(6, midi);
                  break;
               case gen.knobCCs[7]:
                  setKnobValue(7, midi);
                  break;

               // Set Faders:
               case gen.faderCCs[0]:
                  gen.trackBank.getChannel(0).getVolume().set(midi.data2, 128);
                  break;
               case gen.faderCCs[1]:
                  gen.trackBank.getChannel(1).getVolume().set(midi.data2, 128);
                  break;
               case gen.faderCCs[2]:
                  gen.trackBank.getChannel(2).getVolume().set(midi.data2, 128);
                  break;
               case gen.faderCCs[3]:
                  gen.trackBank.getChannel(3).getVolume().set(midi.data2, 128);
                  break;
               case gen.faderCCs[4]:
                  gen.trackBank.getChannel(4).getVolume().set(midi.data2, 128);
                  break;
               case gen.faderCCs[5]:
                  gen.trackBank.getChannel(5).getVolume().set(midi.data2, 128);
                  break;
               case gen.faderCCs[6]:
                  gen.trackBank.getChannel(6).getVolume().set(midi.data2, 128);
                  break;
               case gen.faderCCs[7]:
                  gen.trackBank.getChannel(7).getVolume().set(midi.data2, 128);
                  break;

              // Set Faders:
              case gen.trackButtonsCCs[0]:
                 gen.trackBank.getChannel(0).select();
                 break;
              case gen.trackButtonsCCs[1]:
                 gen.trackBank.getChannel(1).select();
                 break;
              case gen.trackButtonsCCs[2]:
                 gen.trackBank.getChannel(2).select();
                 break;
              case gen.trackButtonsCCs[3]:
                 gen.trackBank.getChannel(3).select();
                 break;
              case gen.trackButtonsCCs[4]:
                 gen.trackBank.getChannel(4).select();
                 break;
              case gen.trackButtonsCCs[5]:
                 gen.trackBank.getChannel(5).select();
                 break;
              case gen.trackButtonsCCs[6]:
                 gen.trackBank.getChannel(6).select();
                 break;
              case gen.trackButtonsCCs[7]:
                 gen.trackBank.getChannel(7).select();
                 break;
            }
         }
         break;
      //case "NoteOn":
      //	 break;
      //case "NoteOff":
      //	 break;
      //case "KeyPressure":
      //	 break;
      //case "ProgramChange":
      //	 break;
      //case "ChannelPressure":
      //	 break;
      //case "PitchBend":
      //	 break;
      case "Other":
         // MMC
         if (midi.isMIDIStart()) {
            gen.transport.restart();
         }
         else if (midi.isMIDIStop()) {
            gen.transport.stop();
         }
         else if (midi.isMIDIContinue()) {
            gen.transport.play();
         }
         break;
   }
}

// The Main Sysex Callback:
function onSysex(data) {
   printSysex(data);
   // MMC Transport Controls:
   switch (data) {
      case "f07f7f0605f7":
         gen.transport.rewind();
         break;
      case "f07f7f0604f7":
         gen.transport.fastForward();
         break;
      case "f07f7f0601f7":
         gen.transport.stop();
         break;
      case "f07f7f0602f7":
         gen.transport.play();
         break;
      case "f07f7f0606f7":
         gen.transport.record();
         break;
   }
   if (gen.midiMonEnable) {
      gen.midiMonChannelPre.set("");
      gen.midiMonTypePre.set("Sysex Data");
      gen.midiMonDataPre.set("[" + prettyHex(data) + "]");
   }
}

// Helper Function to set the Knob Mode in one go:
function setKnobMode() {
   var macro = false;
   var common = false;
   var envelope = false;
   var user = false;

   switch (gen.knobMode) {
      case 0:
         host.showPopupNotification("Macro Mode");
         gen.knobModeDisplay.set("Macro Mode");
         macro = true;
         break;
      case 1:
         host.showPopupNotification("Common Parameters");
         gen.knobModeDisplay.set("Common Parameters");
         common = true;
         break;
      case 2:
         host.showPopupNotification("Envelope Parameters");
         gen.knobModeDisplay.set("Envelope Parameters");
         envelope = true;
         break;
      default:
         gen.cursorDevice.setParameterPage(gen.knobMode - 3);
         host.showPopupNotification("Mapping: " + gen.pageNames[gen.knobMode - 3]);
         gen.knobModeDisplay.set("Mapping: " + gen.pageNames[gen.knobMode - 3]);
         user = true;
         break;
   }
   for (var i = 0; i < 8; i++) {
      gen.cursorDevice.getMacro(i).getAmount().setIndication(macro);
      gen.cursorDevice.getEnvelopeParameter(i).setIndication(envelope);
      gen.cursorDevice.getCommonParameter(i).setIndication(common);
      gen.cursorDevice.getParameter(i).setIndication(user);
   }
   // Envelope Parameters is the only set with 9 Parameters...
   gen.cursorDevice.getEnvelopeParameter(8).setIndication(envelope);
}

// Helper Function to set the Knob Value depending on the current Mode:
function setKnobValue(index, midi) {
  var val;
  var inc = function(i){
    var v
    if(i<64) {
      v = i;
    } else {
      v = -(128 - i);
    }
    return v;
  }

   switch (gen.knobMode) {
      case 0:
         val = gen.cursorDevice.getMacro(index).getAmount();
         break;
      case 1:
         val = gen.cursorDevice.getCommonParameter(index);
         break;
      case 2:
         val = gen.cursorDevice.getEnvelopeParameter(index);
         break;
      default:
         val = gen.cursorDevice.getParameter(index);
         break;
   }

   if (gen.knobsRelative) {
     val.inc(inc(midi.data2), 128);
   } else {
     val.set(inc(midi.data2), 128);
   }
}

// Helper for the Midi Monitor to prettify the Midi Data:
function prettyMidi(status, data1, data2) {
   return (status + ", " + data1 + ", " + data2 + "   [" + uint8ToHex(status) + uint7ToHex(data1) + uint7ToHex(data2) + "]");
}

// Helper Function to switch on and off the additional Transport Controls:
function setTransportPrefsVisible() {
   try {
      for (var i = 0; i < 6; i++) {
         if (gen.transportEnabled) {
            gen.transportSelectionNum === i ? gen.transportCCsPre[i].show() : gen.transportCCsPre[i].hide();
         }
         else {
            gen.transportCCsPre[i].hide();
         }
      }
      gen.transportEnabled ? gen.transportSelectionPre.show() : gen.transportSelectionPre.hide();
      gen.transportEnabled ? gen.learnTransportPre.show() : gen.learnTransportPre.hide();
   }
   catch (e) {
   }
}

// Helper Function to switch on and off the additional Knob Controls:
function setKnobPrefsVisible() {
   try {
      for (var i = 0; i < 8; i++) {
         if (gen.knobsEnabled) {
            gen.knobSelectionNum === i ? gen.knobCCsPre[i].show() : gen.knobCCsPre[i].hide();
         }
         else {
            gen.knobCCsPre[i].hide();
         }
      }
      gen.knobsEnabled ? gen.knobSelectionPre.show() : gen.knobSelectionPre.hide();
      gen.knobsEnabled ? gen.knobsRelativePre.show() : gen.knobsRelativePre.hide();
      gen.knobsEnabled ? gen.learnKnobsSinglePre.show() : gen.learnKnobsSinglePre.hide();
      gen.knobsEnabled ? gen.learnKnobsAllPre.show() : gen.learnKnobsAllPre.hide();
   }
   catch (e) {
   }
}

// Helper Function to switch on and off the additional Fader Controls:
function setFadersPrefsVisible() {
   try {
      for (var i = 0; i < 8; i++) {
         if (gen.fadersEnabled) {
            gen.faderSelectionNum === i ? gen.faderCCsPre[i].show() : gen.faderCCsPre[i].hide();
            gen.trackBank.getChannel(i).getVolume().setIndication(true);
         }
         else {
            gen.faderCCsPre[i].hide();
            gen.trackBank.getChannel(i).getVolume().setIndication(false);
         }
      }
      gen.fadersEnabled ? gen.faderSelectionPre.show() : gen.faderSelectionPre.hide();
      gen.fadersEnabled ? gen.learnFadersSinglePre.show() : gen.learnFadersSinglePre.hide();
      gen.fadersEnabled ? gen.learnFadersAllPre.show() : gen.learnFadersAllPre.hide();

   }
   catch (e) {
   }
}
// Helper Function to switch on and off the additional Fader Controls:
function setTrackButtonsPrefsVisible() {
   try {
      for (var i = 0; i < 8; i++) {
         if (gen.trackButtonsEnabled) {
            gen.trackButtonsSelectionNum === i ? gen.trackButtonsCCsPre[i].show() : gen.trackButtonsCCsPre[i].hide();
            gen.trackBank.getChannel(i).getVolume().setIndication(true);
         }
         else {
            gen.trackButtonsCCsPre[i].hide();
            gen.trackBank.getChannel(i).getVolume().setIndication(false);
         }
      }
      gen.trackButtonsEnabled ? gen.trackButtonsSelectionPre.show() : gen.trackButtonsSelectionPre.hide();
      gen.trackButtonsEnabled ? gen.learnTrackButtonsSinglePre.show() : gen.learnTrackButtonsSinglePre.hide();
      gen.trackButtonsEnabled ? gen.learnTrackButtonsAllPre.show() : gen.learnTrackButtonsAllPre.hide();

   }
   catch (e) {
   }
}

// A function to create an indexed function for the Observers
function getValueObserverFunc(index, varToStore) {
   return function (value) {
      varToStore[index] = value;
   }
}

// Leaving...
function exit() {
   // nothing to do here :-)
}
