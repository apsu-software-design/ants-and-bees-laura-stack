import {AntColony, Place} from './game';


/** controls the reduction of armor for all insects: ants and bees.
*/
export abstract class Insect {
  readonly name:string;

  constructor(protected armor:number, protected place:Place){}

  getName():string { return this.name; }
  getArmor():number { return this.armor; }
  getPlace() { return this.place; }
  setPlace(place:Place){ this.place = place; }
/** 
*Subtracts a specified amount from a players armor. Depending on how much armor they have, the insect may be removed from the spot they are at.
*@param amount is the amount of armor that will be subtracted from a player's armor value
*@return true if there is no more armor, false otherwise
*/
  reduceArmor(amount:number):boolean {
    this.armor -= amount;
    if(this.armor <= 0){
      console.log(this.toString()+' ran out of armor and expired');
      this.place.removeInsect(this);
      return true;
    }
    return false;
  }

  abstract act(colony?:AntColony):void;

  toString():string {
    return this.name + '('+(this.place ? this.place.name : '')+')';
  }
}

/**Basic bee actions made here.
*/
export class Bee extends Insect {
  readonly name:string = 'Bee';
  private status:string;

  constructor(armor:number, private damage:number, place?:Place){
    super(armor, place);
  }

  sting(ant:Ant):boolean{
    console.log(this+ ' stings '+ant+'!');
    return ant.reduceArmor(this.damage);
  }

  isBlocked():boolean {
    return this.place.getAnt() !== undefined;
  }

  setStatus(status:string) { this.status = status; }

/** 
*If a space is blocked, the status will be set to cold and the ant that is at this place will be stung by the bee. 
*If this place is not blocked, and armor is greater than 0, the status of the bee will be stuck and the bee will no longer move.
*/

  act() {
    if(this.isBlocked()){
      if(this.status !== 'cold') {
        this.sting(this.place.getAnt());
      }
    }
    else if(this.armor > 0) {
      if(this.status !== 'stuck'){
        this.place.exitBee(this);
      }
    }    
    this.status = undefined;
  }
}

/**Basic ant actions made here.
*/
export abstract class Ant extends Insect {
  protected boost:string;
  constructor(armor:number, private foodCost:number = 0, place?:Place) {
    super(armor, place);
  }

  getFoodCost():number { return this.foodCost; }
  setBoost(boost:string) { 
    this.boost = boost; 
      console.log(this.toString()+' is given a '+boost);
  }
}

/**
adds boost to colony depending on roll.
*/
export class GrowerAnt extends Ant {
  readonly name:string = "Grower";
  constructor() {
    super(1,1)
  }

/**
*This is how a roll will take place. Depending on the roll, a player will get a boost such as flying, sticky, or ice leaf, or bug spray.
*@param colony creates an AntColony object and will use this function to roll what type of helpful features the colony will receive.
*/

  act(colony:AntColony) {
    let roll = Math.random();
    if(roll < 0.6){
      colony.increaseFood(1);
    } else if(roll < 0.7) {
      colony.addBoost('FlyingLeaf');
    } else if(roll < 0.8) {
      colony.addBoost('StickyLeaf');
    } else if(roll < 0.9) {
      colony.addBoost('IcyLeaf');
    } else if(roll < 0.95) {
      colony.addBoost('BugSpray');
    }
  }  
}
/**Controls what boost action goes against what bee 
*/

export class ThrowerAnt extends Ant {
  readonly name:string = "Thrower";
  private damage:number = 1;

  constructor() {
    super(1,4);
  }

 /** How a ThrowerAnt is meant to act. If they get a particular boost, they will act a certain way. 
 *A target of who to attack is also established.
*/ 
  act() {
    if(this.boost !== 'BugSpray'){ //as long as the boost is not bug spray, continue
      let target;
      if(this.boost === 'FlyingLeaf') //action for FlyingLeaf boost
        target = this.place.getClosestBee(5);
      else
        target = this.place.getClosestBee(3);

      if(target){ //if you have a target, continue
        console.log(this + ' throws a leaf at '+target);
        target.reduceArmor(this.damage);
    
        if(this.boost === 'StickyLeaf'){ //action for StickyLeaf boost
          target.setStatus('stuck');
          console.log(target + ' is stuck!');
        }
        if(this.boost === 'IcyLeaf') { //action for IcyLeaf boost
          target.setStatus('cold');
          console.log(target + ' is cold!');
        }
        this.boost = undefined; //otherwise, not a valid boost
      }
    }
    else { // if the boost was BuySpray 
      console.log(this + ' sprays bug repellant everywhere!');
      let target = this.place.getClosestBee(0);
      while(target){ // as long as you have a target, continue 
        target.reduceArmor(10);
        target = this.place.getClosestBee(0);
      }
      this.reduceArmor(10);
    }
  }
}

/**controls the eaterant and its conditions such as their stomach
*/
export class EaterAnt extends Ant {
  readonly name:string = "Eater";
  private turnsEating:number = 0;
  private stomach:Place = new Place('stomach');
  constructor() {
    super(2,4)
  }

  isFull():boolean {
    return this.stomach.getBees().length > 0;
  }


  /** this is how an eater ant will act when they need to do something. Once thye have a target, they will eat it and it will
  * add the bee that they are eating to the ant's stomach. If they shouldn't eat anymore, the first bee they ate will be taken out of their stomach.'
  */
  act() {
    console.log("eating: "+this.turnsEating);
    if(this.turnsEating == 0){ //if the ant hasn't ate yet, continue '
      console.log("try to eat");
      let target = this.place.getClosestBee(0);
      if(target) { //if you have a target, eat
        console.log(this + ' eats '+target+'!');
        this.place.removeBee(target);
        this.stomach.addBee(target);
        this.turnsEating = 1;
      }
    } else { //if the bee has already eatern
      if(this.turnsEating > 3){ // if the ant has eaten more than 3 times 
        this.stomach.removeBee(this.stomach.getBees()[0]); //remove the bees in the stomach 
        this.turnsEating = 0; //ant hasn't eaten now '
      } 
      else 
        this.turnsEating++;
    }
  }  

/** Reduces the armor of the EaterAnt. If their armor is stil not empty, the amount of times they ate
*will be checked. If they only ate once, the bee that they ate will be removed from their stomach and their stomach will reach full cap. Otherwise, if the amount of times the ant ate
*is greater than 0 but <= 2, they will get the first bee they ate removed from their stomach. Then their armor will be checked.
@param amount is the amount that the ants armor will be reduced conditionally
@return true/false based on the reduceArmor() function. Otherwise, will return false regardless.
*/
  reduceArmor(amount:number):boolean {
    this.armor -= amount; //reduce armor by parameter amount 
    console.log('armor reduced to: '+this.armor);
    if(this.armor > 0){ // if the armor is greater than 0, continue 
      if(this.turnsEating == 1){ //if the ant has only ate once, continue 
        let eaten = this.stomach.getBees()[0]; 
        this.stomach.removeBee(eaten);
        this.place.addBee(eaten);
        console.log(this + ' coughs up '+eaten+'!');
        this.turnsEating = 3;
      }
    }
    else if(this.armor <= 0){ //if armor is less than or equal to 0 , continue 
      if(this.turnsEating > 0 && this.turnsEating <= 2){ //if ant has eaten at least once but less than 3 times, continue 
        let eaten = this.stomach.getBees()[0];
        this.stomach.removeBee(eaten);
        this.place.addBee(eaten);
        console.log(this + ' coughs up '+eaten+'!');
      }
      return super.reduceArmor(amount);
    }
    return false;
  }
}

/** ScubaAnt feats such as reducing armor
*/

export class ScubaAnt extends Ant {
  readonly name:string = "Scuba";
  private damage:number = 1;

  constructor() {
    super(1,5)
  }

/**This is how the ScubaAct will act, depending on the boost that their colony has. Depending on the boost, a target will be selected.
*If they have a target, they will act some type of damage on them based on the boost they have. If and only if their boost is BugSpray,
*the action they perform will be to spray the closest bee.
*/
  act() { //exact copy of other act() function 
    if(this.boost !== 'BugSpray'){
      let target;
      if(this.boost === 'FlyingLeaf')
        target = this.place.getClosestBee(5);
      else
        target = this.place.getClosestBee(3);

      if(target){
        console.log(this + ' throws a leaf at '+target);
        target.reduceArmor(this.damage);
    
        if(this.boost === 'StickyLeaf'){
          target.setStatus('stuck');
          console.log(target + ' is stuck!');
        }
        if(this.boost === 'IcyLeaf') {
          target.setStatus('cold');
          console.log(target + ' is cold!');
        }
        this.boost = undefined;
      }
    }
    else {
      console.log(this + ' sprays bug repellant everywhere!');
      let target = this.place.getClosestBee(0);
      while(target){
        target.reduceArmor(10);
        target = this.place.getClosestBee(0);
      }
      this.reduceArmor(10);
    }
  }
}

/**returns the ant that is guarding a place.
*/

export class GuardAnt extends Ant {
  readonly name:string = "Guard";

  constructor() {
    super(2,4)
  }

  getGuarded():Ant {
    return this.place.getGuardedAnt();
  }

  act() {}
}
