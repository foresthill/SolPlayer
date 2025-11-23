//
//  DataMigration4to7Policy.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/07/03.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation
import CoreData

class DataMigration4to7Policy: NSEntityMigrationPolicy {

    /*
    init() {
        
    }
     */
    
    override func createDestinationInstances(forSource sInstance: NSManagedObject, in mapping: NSEntityMapping, manager: NSMigrationManager) throws {
        let context: NSManagedObjectContext = manager.destinationContext
        let entityName: String = mapping.destinationEntityName!
        let dInstance: NSManagedObject = NSEntityDescription.insertNewObject(forEntityName: entityName, into: context)
        
        /** PlaylistエンティティのidをStringに */
        
        let playListId = sInstance.value(forKey: "id")
        
        if let playListId = playListId {
            if playListId is NSNumber {
                dInstance.setValue("id", forKey: String(describing: playListId))
            }
        }

    }
}
