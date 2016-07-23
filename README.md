Toms-Midi-Learn-Controller
==========================

A generic controller script for Bitwig Studio that allows the user to Midi-Learn Knobs, Faders and Transport Buttons.

This is mainly a proof of concept!
I don't think the script is good enough for prime time, but it may still help some people to use their controllers without scripting or inspire others.

What's missing:
- Device navigation.
- Relative Modes for Knobs/Encoders.
- Different scripts for controllers with different numbers of in- and outputs.
- Master Fader.

You will find that the GUI in preferences is not really optimal. The settings were never thougth for dynamic usage in advanced ways so don't be surprised when it feels a bit clumsy ;-)

Known Issues:
- It's not possible to change the number of in- and outputs of a controller script on the fly with the API, so this script only works for controller with one input and one output ATM.
- The numeric settings sometimes move around randomly. So if the GUI looks confusing, it may be that this bug did hit you. Delete the controller and re-load it. Hopefully it will look correct again.
- The popup notifications when midi-learning are unreliable. On my machine they only pop up very shortly when Preferences are open.


Installation:
Move the two scripts "TomsMidiLearnController.control.js" and "TomsMidi.js" into a folder of your choice (z.B. "TomsGeneric") in the Bitwig Studio User Folder:
On Windows the path is "YourUserFolder\Documents\Bitwig Studio\Controller Scripts\"
On OSX it's also in "YourUserFolder\Documents\Bitwig Studio\Controller Scripts\"
On Linux you find it in "YourUserFolder\Bitwig Studio\Controller Scripts\"


Start Bitwig Studio and got to Preferences -> Controllers -> Add controller manually -> Generic -> "Controller"
This should create a new controller entry in the list called "Generic Controller".
Double click the name to rename it if you want.
Select the midi input and midi output to use from the two dropdowns.
Unfold the setting with the gear icon on the left.


Setup:
First enable the Midi Monitor.
These settings don't do anything and are only there as reference for you, so you can see what your controller is sending.

If your controller has transport buttons, check if they work already.
If yes, they are using Sysex commands which are hardcoded and don't need to be learned.
(Since there is no Sysex command for "Loop", you may still want to learn that one though).

To do so, first press "Yes" for "Controller has Transport Buttons" to enable the other controlls for this part.
Next select the transport command you want to learn from the dropdown.
Then press first "Learn" and second press the corresponding button on your controller.
The correct CC should now show up in the numberical CC field.
Do so for all transport controls.

If your controller has knobs, press "Yes" for "Controller has Knobs" to enable the learn-controls.
You can either learn a single knob by selecting it from the dropdown and then hit "Learn" behind "Learn current Knob" and then wiggle the knob you want to learn on your controller.
Or you can learn all 8 knobs in a row (recommended) by hitting "Learn" behind "Learn all Knobs".
A popup notification should ask you to turn the first knob on your controller now, so wiggle it a bit until the next popup asks you to wiggle the second knob and so on.
When all 8 knobs are learned, you should be good to go.

If you don't have any free buttons to change the mode of the knobs, you can go to the I/O panel (third icon on the bottom left of Bitwig Studio) and open the dropdown for "Controller" (or however you named it) and you will see Knob Mode -> Previous/Next Buttons to cycle through the available modes.
These Modes are Macro, Common Parameters, Envelope Parameters and then all the available User Device Panel Mappings.
This is related to the currently selected device in the GUI.
There is no device navigation in this script, so you need to select the device you want to edit with the mouse in Bitwig Studio.

If you have one or two buttons to spare for selecting the mode, go to "Knob Mode Buttons" and select the number you have available.
If you select "One", a single button will cycle through all available modes (should work fine in most cases).
If you select "Two" two buttons will allow you to move forward and backward through the modes.
Midi learn of the two buttons works as before:
Select how many buttons you want to use, then hit "Learn" behind "Learn Knob Mode Buttons" and press either one button or two in a row.
If something should go wrong, just try learning again.

Finally, if your controller has faders, enable them like you did before to enable the learn controls.
And again you can either learn single faders or all 8 in a row.
The faders always control the volume of a bank of 8 tracks.

You can either move that bank up and down with the controls in the I/O panel (similar to the knob mode above), or you can assign two buttons on your controller to it.


Important:
- The script expects your keyboard to send notes on midi channel 1 and pads (if any) on midi channel 10.
