//
//  Playlist+CoreDataProperties.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/07/03.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//
//  Choose "Create NSManagedObject Subclass…" from the Core Data editor menu
//  to delete and recreate this implementation file for your updated model.
//

import Foundation
import CoreData

extension Playlist {

    @NSManaged var id: String?
    @NSManaged var name: String?
    @NSManaged var playNumber: NSNumber?
    @NSManaged var relationship: Song?

}
