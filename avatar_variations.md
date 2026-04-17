# Task
I want to add feature to the platform. I want for every avatar to have variation.

Variation could be anything of the following:
- Another clothes
- Another background
- Another pose

## Low-level idea

Technically, variation is just another photo that user generates describing(selecting) what to change from the basis photo(first generated look of avatar). Let's limit user now to 3 characteristics that could be described as stated in the task: clothes, background, pose.

All these 3 variations could be selected for user using LLM, so that LLM comes up with the idea for which clothes, background and pose could fit this avatar(taking as input avatar details).

## Location
The best place for management of variations 

## User flow

Now user may follow several flows:
1. Create Avatar -> Generate post with avatar
2. Create Avatar -> Create new avatar variation -> Post avatar with selected variation
3. Create variation on existing avatar -> Post avatar with selected variation
